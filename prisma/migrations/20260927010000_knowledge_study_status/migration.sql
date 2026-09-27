-- Controle do que falta estudar: status de estudo no Conhecimento, igual ao
-- que já existe para Livros (QUERO_LER/LENDO/LIDO).

-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('QUERO_ESTUDAR', 'ESTUDANDO', 'ESTUDADO', 'PAUSADO', 'ABANDONADO');

-- AlterTable
ALTER TABLE "Knowledge" ADD COLUMN     "status" "StudyStatus" NOT NULL DEFAULT 'QUERO_ESTUDAR',
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "finishedAt" TIMESTAMP(3);
