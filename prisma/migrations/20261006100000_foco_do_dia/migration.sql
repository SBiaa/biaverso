-- Foco do dia: as tarefas que ela escolhe como prioridade de cada dia.
-- Tabela nova, nada existente muda.

-- CreateTable
CREATE TABLE "DayFocus" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayFocus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DayFocus_dayId_idx" ON "DayFocus"("dayId");

-- CreateIndex
CREATE UNIQUE INDEX "DayFocus_dayId_kind_taskId_key" ON "DayFocus"("dayId", "kind", "taskId");

-- AddForeignKey
ALTER TABLE "DayFocus" ADD CONSTRAINT "DayFocus_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
