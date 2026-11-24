-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LINK', 'DRIVE', 'FIGMA', 'BRIEFING', 'CONTRATO', 'OUTRO');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "content" TEXT;

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'LINK',
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCredential" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "passwordEntryId" TEXT NOT NULL,

    CONSTRAINT "ProjectCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPriceItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectPriceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "collectionId" TEXT NOT NULL,

    CONSTRAINT "CollectionTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCredential_projectId_idx" ON "ProjectCredential"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCredential_passwordEntryId_idx" ON "ProjectCredential"("passwordEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCredential_projectId_passwordEntryId_key" ON "ProjectCredential"("projectId", "passwordEntryId");

-- CreateIndex
CREATE INDEX "ProjectPriceItem_projectId_idx" ON "ProjectPriceItem"("projectId");

-- CreateIndex
CREATE INDEX "CollectionTask_collectionId_order_idx" ON "CollectionTask"("collectionId", "order");

-- CreateIndex
CREATE INDEX "CollectionTask_dueDate_done_idx" ON "CollectionTask"("dueDate", "done");

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCredential" ADD CONSTRAINT "ProjectCredential_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCredential" ADD CONSTRAINT "ProjectCredential_passwordEntryId_fkey" FOREIGN KEY ("passwordEntryId") REFERENCES "PasswordEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPriceItem" ADD CONSTRAINT "ProjectPriceItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTask" ADD CONSTRAINT "CollectionTask_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
