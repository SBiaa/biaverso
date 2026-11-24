-- Módulos ativáveis por negócio.
--
-- Antes todo negócio tinha as mesmas abas hardcodadas na página. Agora cada um
-- liga só o que usa, e a ordem das linhas define a ordem das abas.

CREATE TYPE "ModuleType" AS ENUM (
  'CRONOGRAMA',
  'PRODUCAO',
  'CLIENTES',
  'PROJETOS',
  'PEDIDOS',
  'COLECOES',
  'FINANCEIRO'
);

CREATE TABLE "BusinessModule" (
  "id" TEXT NOT NULL,
  "module" "ModuleType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "businessId" TEXT NOT NULL,

  CONSTRAINT "BusinessModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessModule_businessId_module_key" ON "BusinessModule"("businessId", "module");
CREATE INDEX "BusinessModule_businessId_order_idx" ON "BusinessModule"("businessId", "order");

ALTER TABLE "BusinessModule" ADD CONSTRAINT "BusinessModule_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ligação inicial dos negócios que já existem, para que a página deles continue
-- mostrando o que mostrava antes desta migration.
INSERT INTO "BusinessModule" ("id", "businessId", "module", "order")
SELECT gen_random_uuid()::text, b."id", m."module"::"ModuleType", m."order"
FROM "Business" b
JOIN (VALUES
  ('Ace', 'CRONOGRAMA', 0),
  ('Ace', 'PRODUCAO', 1),
  ('Ace', 'CLIENTES', 2),
  ('Ace', 'PROJETOS', 3),
  ('Ace', 'FINANCEIRO', 4),
  ('Biatrix Tarot', 'CLIENTES', 0),
  ('Biatrix Tarot', 'PROJETOS', 1),
  ('Biatrix Tarot', 'FINANCEIRO', 2),
  ('Creative', 'CRONOGRAMA', 0),
  ('Creative', 'PEDIDOS', 1),
  ('Creative', 'COLECOES', 2),
  ('Creative', 'PROJETOS', 3),
  ('Creative', 'FINANCEIRO', 4)
) AS m("business", "module", "order") ON m."business" = b."name"
ON CONFLICT ("businessId", "module") DO NOTHING;

-- Qualquer outro negócio já cadastrado fica com o mínimo, para não abrir a
-- página sem nenhuma aba. O resto se liga na tela de configurações do negócio.
INSERT INTO "BusinessModule" ("id", "businessId", "module", "order")
SELECT gen_random_uuid()::text, b."id", m."module"::"ModuleType", m."order"
FROM "Business" b
CROSS JOIN (VALUES
  ('CLIENTES', 0),
  ('PROJETOS', 1),
  ('FINANCEIRO', 2)
) AS m("module", "order")
WHERE b."name" NOT IN ('Ace', 'Biatrix Tarot', 'Creative')
ON CONFLICT ("businessId", "module") DO NOTHING;
