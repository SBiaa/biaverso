/*
  Warnings:

  - Added the required column `businessId` to the `ContentPost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `businessId` to the `ProductionTask` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ContentPost" ADD COLUMN     "businessId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ProductionTask" ADD COLUMN     "businessId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
