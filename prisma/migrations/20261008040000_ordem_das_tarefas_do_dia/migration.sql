-- Ordem de execução das tarefas do dia a dia, montada por arrastar.
-- Tabela nova, nada existente muda.

-- CreateTable
CREATE TABLE "WorkTaskOrder" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "WorkTaskOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkTaskOrder_kind_taskId_key" ON "WorkTaskOrder"("kind", "taskId");
