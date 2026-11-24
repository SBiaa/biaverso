-- Data de realização (o dia em que ela vai fazer) ao lado do prazo máximo,
-- como a aula já tinha. Colunas novas e vazias: nada do que existe muda.

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "scheduledDate" TIMESTAMP(3);
ALTER TABLE "ProspectTask" ADD COLUMN "scheduledDate" TIMESTAMP(3);
ALTER TABLE "ProductionTask" ADD COLUMN "scheduledDate" TIMESTAMP(3);
ALTER TABLE "CollectionTask" ADD COLUMN "scheduledDate" TIMESTAMP(3);
ALTER TABLE "SpiritualStudy" ADD COLUMN "scheduledDate" TIMESTAMP(3);
