-- Prioridade (lista editável) e tempo estimado nas tarefas de produção e de coleção.
-- Só colunas opcionais: nenhuma tarefa existente muda.

-- CreateTable
CREATE TABLE "PriorityLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriorityLevel_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ProductionTask" ADD COLUMN "priorityLevelId" TEXT,
ADD COLUMN "estimateMinutes" INTEGER;

-- AlterTable
ALTER TABLE "CollectionTask" ADD COLUMN "priorityLevelId" TEXT,
ADD COLUMN "estimateMinutes" INTEGER;

-- CreateIndex
CREATE INDEX "ProductionTask_priorityLevelId_idx" ON "ProductionTask"("priorityLevelId");

-- CreateIndex
CREATE INDEX "CollectionTask_priorityLevelId_idx" ON "CollectionTask"("priorityLevelId");

-- AddForeignKey
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_priorityLevelId_fkey" FOREIGN KEY ("priorityLevelId") REFERENCES "PriorityLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTask" ADD CONSTRAINT "CollectionTask_priorityLevelId_fkey" FOREIGN KEY ("priorityLevelId") REFERENCES "PriorityLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ponto de partida da lista (Alta, Média, Baixa). Ela edita, apaga e acrescenta
-- depois em Configurações. Não é dado de exemplo: é a configuração inicial.
INSERT INTO "PriorityLevel" ("id", "name", "color", "order") VALUES
    ('priority_alta', 'Alta', '#DC2626', 0),
    ('priority_media', 'Média', '#D97706', 1),
    ('priority_baixa', 'Baixa', '#64748B', 2);
