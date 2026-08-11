-- AlterTable
ALTER TABLE "Subtask" ADD COLUMN     "collectionTaskId" TEXT;

-- CreateIndex
CREATE INDEX "Subtask_collectionTaskId_order_idx" ON "Subtask"("collectionTaskId", "order");

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_collectionTaskId_fkey" FOREIGN KEY ("collectionTaskId") REFERENCES "CollectionTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
