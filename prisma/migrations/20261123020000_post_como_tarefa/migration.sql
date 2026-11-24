-- O post como tarefa no Dia: andamento, data de fazer, prioridade e tempo,
-- os mesmos campos da tarefa de produção.

-- AlterTable
ALTER TABLE "ContentPost" ADD COLUMN     "estimateMinutes" INTEGER,
ADD COLUMN     "priorityLevelId" TEXT,
ADD COLUMN     "progress" "TaskProgress" NOT NULL DEFAULT 'A_FAZER',
ADD COLUMN     "scheduledDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ContentPost_priorityLevelId_idx" ON "ContentPost"("priorityLevelId");

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_priorityLevelId_fkey" FOREIGN KEY ("priorityLevelId") REFERENCES "PriorityLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
