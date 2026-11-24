-- Despejo do planejamento do ano: itens soltos que depois viram meta,
-- desejo, ficam para depois ou são soltos.

-- CreateEnum
CREATE TYPE "BrainstormDecision" AS ENUM ('FOCO', 'DESEJO', 'DEPOIS', 'SOLTAR');

-- CreateTable
CREATE TABLE "BrainstormItem" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "decision" "BrainstormDecision",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pillarId" TEXT,
    "measuredGoalId" TEXT,
    "desireId" TEXT,
    "carriedFromId" TEXT,

    CONSTRAINT "BrainstormItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrainstormItem_measuredGoalId_key" ON "BrainstormItem"("measuredGoalId");

-- CreateIndex
CREATE UNIQUE INDEX "BrainstormItem_desireId_key" ON "BrainstormItem"("desireId");

-- CreateIndex
CREATE UNIQUE INDEX "BrainstormItem_carriedFromId_key" ON "BrainstormItem"("carriedFromId");

-- CreateIndex
CREATE INDEX "BrainstormItem_year_idx" ON "BrainstormItem"("year");

-- CreateIndex
CREATE INDEX "BrainstormItem_pillarId_idx" ON "BrainstormItem"("pillarId");

-- AddForeignKey
ALTER TABLE "BrainstormItem" ADD CONSTRAINT "BrainstormItem_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "Pillar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainstormItem" ADD CONSTRAINT "BrainstormItem_measuredGoalId_fkey" FOREIGN KEY ("measuredGoalId") REFERENCES "MeasuredGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainstormItem" ADD CONSTRAINT "BrainstormItem_desireId_fkey" FOREIGN KEY ("desireId") REFERENCES "Desire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainstormItem" ADD CONSTRAINT "BrainstormItem_carriedFromId_fkey" FOREIGN KEY ("carriedFromId") REFERENCES "BrainstormItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

