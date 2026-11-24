-- Etapa de cada passo das tarefas de produção (Roteiro, Gravação, Edição...).
-- Nula nos passos que já existem: aparecem como "sem etapa", nada é perdido.

-- AlterTable
ALTER TABLE "Subtask" ADD COLUMN "stage" TEXT;
