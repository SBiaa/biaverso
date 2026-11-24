-- Aulas com data de execução (dia que quer fazer) e prazo (data máxima).
ALTER TABLE "StudyLesson" ADD COLUMN "scheduledDate" TIMESTAMP(3),
ADD COLUMN "dueDate" TIMESTAMP(3);

CREATE INDEX "StudyLesson_scheduledDate_idx" ON "StudyLesson"("scheduledDate");
CREATE INDEX "StudyLesson_dueDate_idx" ON "StudyLesson"("dueDate");
