-- O cronômetro passa a poder apontar para as tarefas de produção (as da página
-- do projeto). Só uma coluna nova e vazia: nada do que existe muda.

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN "productionTaskId" TEXT;

-- CreateIndex
CREATE INDEX "TimeEntry_productionTaskId_idx" ON "TimeEntry"("productionTaskId");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_productionTaskId_fkey" FOREIGN KEY ("productionTaskId") REFERENCES "ProductionTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
