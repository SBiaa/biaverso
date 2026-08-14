-- CENTRAL DE PRODUTOS
--
-- Antes o produto nascia dentro da coleção: cada coleção recadastrava a mesma
-- caneca do zero. Nos dados reais isso deu 17 cadastros para 8 produtos de
-- verdade (7 canecas, 3 almofadas, 2 mousepads...) e o custo só estava
-- preenchido em 2 deles — subiu o preço do blank e nenhuma margem ficava certa.
--
-- Agora existem duas camadas: Product é a base (o item físico e o que custa
-- produzir uma unidade) e CollectionProduct é a peça daquela coleção (a arte
-- aplicada e o preço da temporada). Mudar o custo da base recalcula a margem de
-- todas as coleções, dos três negócios.
--
-- Esta migração NÃO joga fora nada: cada linha existente vira uma peça ligada à
-- sua base, mantendo nome, descrição, preço e imagem. Os dois custos que
-- existiam (caneca R$17, squeeze R$25) viram o primeiro item de custo da base.

-- CreateEnum
CREATE TYPE "ProductCostKind" AS ENUM ('MATERIAL', 'IMPRESSAO', 'EMBALAGEM', 'MAO_DE_OBRA', 'FRETE', 'TAXA', 'OUTRO');

-- CreateEnum
CREATE TYPE "ProductCostMode" AS ENUM ('FIXO', 'PERCENTUAL', 'TEMPO');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "imageUrl" TEXT,
    "basePrice" DOUBLE PRECISION,
    "targetMargin" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCostItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "ProductCostKind" NOT NULL DEFAULT 'MATERIAL',
    "mode" "ProductCostMode" NOT NULL DEFAULT 'FIXO',
    "amount" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductCostItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_active_name_idx" ON "Product"("active", "name");

-- CreateIndex
CREATE INDEX "Product_businessId_idx" ON "Product"("businessId");

-- CreateIndex
CREATE INDEX "ProductCostItem_productId_order_idx" ON "ProductCostItem"("productId", "order");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCostItem" ADD CONSTRAINT "ProductCostItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: as configurações ganham valor/hora e margem desejada.
ALTER TABLE "UserSettings" ADD COLUMN "hourlyRate" DOUBLE PRECISION;
ALTER TABLE "UserSettings" ADD COLUMN "targetMargin" DOUBLE PRECISION NOT NULL DEFAULT 60;

-- AlterTable: a peça da coleção passa a apontar para a base. `productId` entra
-- nulo, é preenchido logo abaixo e só então vira NOT NULL — a ordem importa,
-- senão a tabela com dados recusaria a coluna obrigatória.
ALTER TABLE "CollectionProduct" ADD COLUMN "productId" TEXT;
ALTER TABLE "CollectionProduct" ADD COLUMN "extraCost" DOUBLE PRECISION;
ALTER TABLE "CollectionProduct" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CollectionProduct" ALTER COLUMN "name" DROP NOT NULL;

-- As bases que os dados atuais revelam. Todas sem negócio: a caneca serve para
-- Creative, Alternative Space e EntreMundos igual.
INSERT INTO "Product" ("id", "name", "category", "basePrice", "updatedAt") VALUES
  ('prd_base_caneca',   'Caneca 325ml',    'Canecas',    50, CURRENT_TIMESTAMP),
  ('prd_base_almofada', 'Almofada 30x30',  'Almofadas',  30, CURRENT_TIMESTAMP),
  ('prd_base_mousepad', 'Mousepad',        'Mousepads',  40, CURRENT_TIMESTAMP),
  ('prd_base_squeeze',  'Squeeze',         'Garrafas',   50, CURRENT_TIMESTAMP),
  ('prd_base_camiseta', 'Camiseta',        'Vestuário',  NULL, CURRENT_TIMESTAMP),
  ('prd_base_chinelo',  'Chinelo',         'Vestuário',  NULL, CURRENT_TIMESTAMP),
  ('prd_base_mochila',  'Mochila',         'Acessórios', NULL, CURRENT_TIMESTAMP),
  ('prd_base_quadro',   'Quadro',          'Decoração',  NULL, CURRENT_TIMESTAMP);

-- Os dois custos que já existiam viram o primeiro item de custo da base, para
-- não sumirem. Ficam como "Custo estimado" porque não dá para saber, olhando um
-- número só, quanto era blank, quanto era impressão e quanto era embalagem.
INSERT INTO "ProductCostItem" ("id", "label", "kind", "mode", "amount", "order", "productId") VALUES
  ('prdcost_caneca_est',  'Custo estimado (revisar)', 'MATERIAL', 'FIXO', 17, 0, 'prd_base_caneca'),
  ('prdcost_squeeze_est', 'Custo estimado (revisar)', 'MATERIAL', 'FIXO', 25, 0, 'prd_base_squeeze');

-- Liga cada peça existente à sua base pelo nome que você cadastrou.
UPDATE "CollectionProduct" SET "productId" = CASE
  WHEN lower("name") LIKE '%caneca%'   THEN 'prd_base_caneca'
  WHEN lower("name") LIKE '%almofada%' THEN 'prd_base_almofada'
  WHEN lower("name") LIKE '%mouse%'    THEN 'prd_base_mousepad'
  WHEN lower("name") LIKE '%squeeze%'  THEN 'prd_base_squeeze'
  WHEN lower("name") LIKE '%camiseta%' THEN 'prd_base_camiseta'
  WHEN lower("name") LIKE '%chinelo%'  THEN 'prd_base_chinelo'
  WHEN lower("name") LIKE '%mochila%'  THEN 'prd_base_mochila'
  WHEN lower("name") LIKE '%quadro%'   THEN 'prd_base_quadro'
END
WHERE "productId" IS NULL;

-- Rede de segurança: qualquer peça que não caiu em nenhum dos nomes acima ganha
-- uma base própria, com o custo que ela tinha. Ninguém fica para trás — e sem
-- isso o NOT NULL logo abaixo derrubaria a migração.
INSERT INTO "Product" ("id", "name", "basePrice", "updatedAt")
SELECT 'prd_' || "id", "name", "price", CURRENT_TIMESTAMP
FROM "CollectionProduct" WHERE "productId" IS NULL;

INSERT INTO "ProductCostItem" ("id", "label", "amount", "productId")
SELECT 'prdcost_' || "id", 'Custo estimado (revisar)', "cost", 'prd_' || "id"
FROM "CollectionProduct" WHERE "productId" IS NULL AND "cost" IS NOT NULL;

UPDATE "CollectionProduct" SET "productId" = 'prd_' || "id" WHERE "productId" IS NULL;

-- Preço igual ao da base vira "herda da base": reajustar a base passa a valer
-- para essas peças sozinho. Só quem tinha preço diferente guarda o próprio.
UPDATE "CollectionProduct" cp SET "price" = NULL
FROM "Product" p
WHERE cp."productId" = p."id" AND cp."price" IS NOT NULL AND cp."price" = p."basePrice";

-- Ordem dentro da coleção, seguindo o que já estava na tela (mais antigo primeiro).
UPDATE "CollectionProduct" cp SET "order" = ranked."rn"
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "collectionId" ORDER BY "createdAt") - 1 AS "rn"
  FROM "CollectionProduct"
) ranked
WHERE cp."id" = ranked."id";

-- Agora sim: obrigatório, com chave estrangeira. RESTRICT no delete porque
-- apagar uma base usada em coleção apagaria a peça junto — o app avisa antes.
ALTER TABLE "CollectionProduct" ALTER COLUMN "productId" SET NOT NULL;
ALTER TABLE "CollectionProduct" ADD CONSTRAINT "CollectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- O custo agora é calculado a partir dos itens da base + `extraCost` da peça.
ALTER TABLE "CollectionProduct" DROP COLUMN "cost";

-- DropIndex / CreateIndex: a lista da coleção passa a ler por ordem.
DROP INDEX "CollectionProduct_collectionId_idx";
CREATE INDEX "CollectionProduct_collectionId_order_idx" ON "CollectionProduct"("collectionId", "order");
CREATE INDEX "CollectionProduct_productId_idx" ON "CollectionProduct"("productId");
