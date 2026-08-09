-- AlterTable
ALTER TABLE "CreditCardEntry" ADD COLUMN     "purchaseId" TEXT;

-- AlterTable: dueDate entra nula, é preenchida a partir de FixedBill.dueDay e só
-- depois vira NOT NULL, para não quebrar em bases que já têm logs.
ALTER TABLE "FixedBillLog" ADD COLUMN     "dueDate" TIMESTAMP(3);

UPDATE "FixedBillLog" AS l
SET "dueDate" = make_date(
  l."year",
  l."month",
  LEAST(
    b."dueDay",
    EXTRACT(DAY FROM (make_date(l."year", l."month", 1) + INTERVAL '1 month' - INTERVAL '1 day'))::int
  )
)
FROM "FixedBill" AS b
WHERE b."id" = l."fixedBillId";

UPDATE "FixedBillLog" SET "dueDate" = make_date("year", "month", 1) WHERE "dueDate" IS NULL;

ALTER TABLE "FixedBillLog" ALTER COLUMN "dueDate" SET NOT NULL;

-- CreateTable
CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Cartão de crédito',
    "closingDay" INTEGER,
    "dueDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCardPurchase" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "installments" INTEGER NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT,

    CONSTRAINT "CreditCardPurchase_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreditCardPurchase" ADD CONSTRAINT "CreditCardPurchase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCardEntry" ADD CONSTRAINT "CreditCardEntry_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "CreditCardPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
