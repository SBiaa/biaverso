-- BIBLIOTECA DE INSUMOS
--
-- Papel transfer, tinta, fita, caixa: coisas compradas em pacote e gastas por
-- peça. Até aqui o jeito de lançar isso era digitar "R$2,40" na composição de
-- custo de cada produto — o mesmo número copiado à mão em oito lugares, que
-- envelhecia junto e nunca era corrigido em todos.
--
-- Agora o insumo é cadastrado como você compra de verdade (R$120 o pacote de
-- 50) e a linha de custo guarda só quanto a peça consome. Reajustar o pacote
-- num lugar recalcula a margem de todo produto que usa aquele insumo.
--
-- Os pedidos já fechados não se mexem: o custo deles foi congelado no
-- OrderItem, e é assim que o histórico continua verdadeiro.

-- AlterEnum
ALTER TYPE "ProductCostMode" ADD VALUE 'INSUMO';

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "packPrice" DOUBLE PRECISION NOT NULL,
    "packQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "supplier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Material_name_idx" ON "Material"("name");

-- AlterTable
ALTER TABLE "ProductCostItem" ADD COLUMN "materialId" TEXT;

-- CreateIndex
CREATE INDEX "ProductCostItem_materialId_idx" ON "ProductCostItem"("materialId");

-- Restrict: apagar um insumo em uso zeraria em silêncio o custo de todo produto
-- que depende dele. A API barra antes, dizendo em quantos produtos ele está.
-- AddForeignKey
ALTER TABLE "ProductCostItem" ADD CONSTRAINT "ProductCostItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
