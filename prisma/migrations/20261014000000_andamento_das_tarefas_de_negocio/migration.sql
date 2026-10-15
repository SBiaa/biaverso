-- Andamento das tarefas de negócio (iniciei, pausei, aguardando algo, travei,
-- com ansiedade). Coluna própria, separada do status de produção, que é
-- reescrito sozinho quando o prazo passa de uma semana.

-- CreateEnum
CREATE TYPE "TaskProgress" AS ENUM ('A_FAZER', 'INICIADA', 'PAUSADA', 'AGUARDANDO', 'TRAVADA', 'COM_ANSIEDADE');

-- AlterTable
ALTER TABLE "ProductionTask" ADD COLUMN "progress" "TaskProgress" NOT NULL DEFAULT 'A_FAZER';
ALTER TABLE "CollectionTask" ADD COLUMN "progress" "TaskProgress" NOT NULL DEFAULT 'A_FAZER';
ALTER TABLE "ProspectTask" ADD COLUMN "progress" "TaskProgress" NOT NULL DEFAULT 'A_FAZER';
