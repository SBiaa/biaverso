-- Conteúdo e projetos internos — sem cliente do outro lado.
--
-- O cronograma da própria Ace, por exemplo, não tem cliente: o post é do negócio.
-- `businessId` já era obrigatório nas duas tabelas desde
-- 20260809124419_add_business_to_ace_items, então aqui só o cliente muda.

ALTER TABLE "ContentPost" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "ProductionTask" ALTER COLUMN "clientId" DROP NOT NULL;

ALTER TABLE "Project" ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- Projeto sem cliente só podia ser do próprio negócio.
UPDATE "Project" SET "isInternal" = true WHERE "clientId" IS NULL;
