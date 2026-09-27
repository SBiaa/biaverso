-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ABERTA', 'PAGA');

-- CreateTable
CREATE TABLE "CreditCardInvoice" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ABERTA',
    "paidAt" TIMESTAMP(3),
    "paidAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentTransactionId" TEXT,

    CONSTRAINT "CreditCardInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditCardInvoice_paymentTransactionId_key" ON "CreditCardInvoice"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "CreditCardInvoice_status_idx" ON "CreditCardInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCardInvoice_month_year_key" ON "CreditCardInvoice"("month", "year");

-- AddForeignKey
ALTER TABLE "CreditCardInvoice" ADD CONSTRAINT "CreditCardInvoice_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
