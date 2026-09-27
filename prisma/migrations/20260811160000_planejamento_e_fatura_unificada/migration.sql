-- AlterTable
ALTER TABLE "FixedBill" ADD COLUMN     "paymentMethod" "PayMethod" NOT NULL DEFAULT 'PIX_DEBITO';

-- AlterTable
ALTER TABLE "FixedBillLog" ADD COLUMN     "amountOverride" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "CreditCardEntry" ADD COLUMN     "installmentGroupId" TEXT,
ADD COLUMN     "installmentNumber" INTEGER,
ADD COLUMN     "installmentTotal" INTEGER;

-- CreateIndex
CREATE INDEX "FixedBill_active_paymentMethod_idx" ON "FixedBill"("active", "paymentMethod");

-- CreateIndex
CREATE INDEX "CreditCardEntry_installmentGroupId_idx" ON "CreditCardEntry"("installmentGroupId");

-- Parcelas antigas: o grupo passa a ser o id da compra e o rotulo "n/total" vira numero.
UPDATE "CreditCardEntry"
SET "installmentGroupId" = "purchaseId",
    "installmentNumber" = split_part("installment", '/', 1)::INTEGER,
    "installmentTotal" = split_part("installment", '/', 2)::INTEGER
WHERE "purchaseId" IS NOT NULL
  AND "installment" ~ '^[0-9]+/[0-9]+$';
