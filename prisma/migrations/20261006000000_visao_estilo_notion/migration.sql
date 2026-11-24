-- CreateEnum
CREATE TYPE "PillarStatus" AS ENUM ('ATIVO', 'PAUSADO');

-- CreateEnum
CREATE TYPE "PillarKind" AS ENUM ('PESSOAL', 'NEGOCIO');

-- CreateEnum
CREATE TYPE "GoalTerm" AS ENUM ('JA', 'CURTO_PRAZO', 'MEDIO_PRAZO', 'LONGO_PRAZO');

-- AlterEnum
ALTER TYPE "MeasuredGoalStatus" ADD VALUE 'NAO_INICIADO';

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "pillarId" TEXT;

-- AlterTable
ALTER TABLE "ConceptualGoal" ADD COLUMN     "category" TEXT,
ADD COLUMN     "challenge" TEXT,
ADD COLUMN     "priorityLevelId" TEXT,
ADD COLUMN     "status" "MeasuredGoalStatus" NOT NULL DEFAULT 'EM_ANDAMENTO';

-- AlterTable
ALTER TABLE "MeasuredGoal" ADD COLUMN     "businessId" TEXT,
ADD COLUMN     "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "targetValue" DOUBLE PRECISION,
ADD COLUMN     "term" "GoalTerm",
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "Pillar" ADD COLUMN     "kind" "PillarKind" NOT NULL DEFAULT 'PESSOAL',
ADD COLUMN     "status" "PillarStatus" NOT NULL DEFAULT 'ATIVO';

-- CreateIndex
CREATE INDEX "Business_pillarId_idx" ON "Business"("pillarId");

-- CreateIndex
CREATE INDEX "ConceptualGoal_priorityLevelId_idx" ON "ConceptualGoal"("priorityLevelId");

-- CreateIndex
CREATE INDEX "MeasuredGoal_businessId_idx" ON "MeasuredGoal"("businessId");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "Pillar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptualGoal" ADD CONSTRAINT "ConceptualGoal_priorityLevelId_fkey" FOREIGN KEY ("priorityLevelId") REFERENCES "PriorityLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasuredGoal" ADD CONSTRAINT "MeasuredGoal_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Central de Visão no estilo do Notion: pilar com status/tipo, objetivo conceitual
-- com status/prioridade/categoria/desafio e objetivo metrificado com termo, meta
-- numérica, valor atual, unidade e empresa. Só colunas novas: nada é apagado, e
-- `target` (texto) e `progress` continuam valendo para objetivo sem meta numérica.

-- Converte as metas que já eram número ("300", "20000") ou "7k" (= 7000). O que não
-- for lido com segurança fica só em `target`, como estava.
UPDATE "MeasuredGoal"
SET "targetValue" = CASE
    WHEN btrim("target") ~ '^[0-9]+([.,][0-9]+)?$'
        THEN replace(btrim("target"), ',', '.')::double precision
    WHEN lower(btrim("target")) ~ '^[0-9]+([.,][0-9]+)?k$'
        THEN replace(substring(lower(btrim("target")) from '^[0-9.,]+'), ',', '.')::double precision * 1000
END
WHERE "target" IS NOT NULL;

-- O progresso que ela digitava (0–100) vira o valor atual equivalente, para a barra
-- continuar mostrando o mesmo percentual depois que passar a ser calculada.
UPDATE "MeasuredGoal"
SET "currentValue" = "progress" / 100.0 * "targetValue"
WHERE "targetValue" IS NOT NULL;
