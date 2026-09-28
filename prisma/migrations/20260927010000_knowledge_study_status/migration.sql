-- Controle do que falta estudar: status de estudo no Conhecimento, igual ao
-- que já existe para Livros (QUERO_LER/LENDO/LIDO).
--
-- Nome do enum é "KnowledgeStudyStatus", e não "StudyStatus", porque esse
-- nome já é do enum do módulo Espiritual (A_FAZER/EM_ANDAMENTO/FEITO/ENTREGUE).

-- CreateEnum
CREATE TYPE "KnowledgeStudyStatus" AS ENUM ('QUERO_ESTUDAR', 'ESTUDANDO', 'ESTUDADO', 'PAUSADO', 'ABANDONADO');

-- AlterTable
ALTER TABLE "Knowledge" ADD COLUMN     "status" "KnowledgeStudyStatus" NOT NULL DEFAULT 'QUERO_ESTUDAR',
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "finishedAt" TIMESTAMP(3);
