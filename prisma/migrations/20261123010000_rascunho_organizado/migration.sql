-- Rascunho organizado sai da lista: data em que foi colocado no lugar e,
-- quando virou só o objetivo conceitual, o vínculo com ele.

-- AlterTable
ALTER TABLE "BrainstormItem" ADD COLUMN     "conceptualGoalId" TEXT,
ADD COLUMN     "organizedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BrainstormItem_conceptualGoalId_idx" ON "BrainstormItem"("conceptualGoalId");

-- AddForeignKey
ALTER TABLE "BrainstormItem" ADD CONSTRAINT "BrainstormItem_conceptualGoalId_fkey" FOREIGN KEY ("conceptualGoalId") REFERENCES "ConceptualGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Os que já viraram meta ou desejo contam como organizados.
UPDATE "BrainstormItem" SET "organizedAt" = "updatedAt"
WHERE "measuredGoalId" IS NOT NULL OR "desireId" IS NOT NULL;
