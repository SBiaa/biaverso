-- Status da tarefa do dia a dia (iniciada, pausada, aguardando, travada, com
-- ansiedade...). `done` continua valendo; as já concluídas viram CONCLUIDA.

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('A_FAZER', 'INICIADA', 'PAUSADA', 'AGUARDANDO', 'TRAVADA', 'COM_ANSIEDADE', 'CONCLUIDA');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "status" "TaskStatus" NOT NULL DEFAULT 'A_FAZER';

-- Backfill
UPDATE "Task" SET "status" = 'CONCLUIDA' WHERE "done" = true;
