-- AlterEnum
ALTER TYPE "ModuleType" ADD VALUE 'SENHAS';

-- CreateTable
CREATE TABLE "BusinessCredential" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,
    "passwordEntryId" TEXT NOT NULL,

    CONSTRAINT "BusinessCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessCredential_businessId_idx" ON "BusinessCredential"("businessId");

-- CreateIndex
CREATE INDEX "BusinessCredential_passwordEntryId_idx" ON "BusinessCredential"("passwordEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCredential_businessId_passwordEntryId_key" ON "BusinessCredential"("businessId", "passwordEntryId");

-- AddForeignKey
ALTER TABLE "BusinessCredential" ADD CONSTRAINT "BusinessCredential_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCredential" ADD CONSTRAINT "BusinessCredential_passwordEntryId_fkey" FOREIGN KEY ("passwordEntryId") REFERENCES "PasswordEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
