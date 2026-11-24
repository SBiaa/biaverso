-- Aulas entram na tabela de tarefas do Dia a dia: prioridade e tempo estimado,
-- como nas demais tarefas.
ALTER TABLE "StudyLesson" ADD COLUMN "priorityLevelId" TEXT,
ADD COLUMN "estimateMinutes" INTEGER;

CREATE INDEX "StudyLesson_priorityLevelId_idx" ON "StudyLesson"("priorityLevelId");

ALTER TABLE "StudyLesson" ADD CONSTRAINT "StudyLesson_priorityLevelId_fkey" FOREIGN KEY ("priorityLevelId") REFERENCES "PriorityLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
