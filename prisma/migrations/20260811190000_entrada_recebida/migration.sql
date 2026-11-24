-- AlterTable
-- Default true: tudo que já estava lançado é dinheiro que de fato entrou.
ALTER TABLE "Transaction" ADD COLUMN     "received" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Transaction_type_received_idx" ON "Transaction"("type", "received");
