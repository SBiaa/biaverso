-- CreateEnum
CREATE TYPE "WishPriority" AS ENUM ('ESSENCIAL', 'QUERO', 'ALGUM_DIA');

-- CreateEnum
CREATE TYPE "WishStatus" AS ENUM ('DESEJADO', 'COMPRADO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "WishCategory" AS ENUM ('EQUIPAMENTO', 'SOFTWARE', 'CASA', 'ROUPA', 'BELEZA', 'LIVRO_CURSO', 'PRESENTE', 'VIAGEM', 'SAUDE', 'OUTRO');

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "imageUrl" TEXT,
    "price" DOUBLE PRECISION,
    "priority" "WishPriority" NOT NULL DEFAULT 'QUERO',
    "status" "WishStatus" NOT NULL DEFAULT 'DESEJADO',
    "category" "WishCategory" NOT NULL DEFAULT 'OUTRO',
    "targetDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "boughtAt" TIMESTAMP(3),
    "boughtPrice" DOUBLE PRECISION,
    "businessId" TEXT,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WishlistItem_status_priority_idx" ON "WishlistItem"("status", "priority");

-- CreateIndex
CREATE INDEX "WishlistItem_businessId_idx" ON "WishlistItem"("businessId");

-- CreateIndex
CREATE INDEX "WishlistItem_category_idx" ON "WishlistItem"("category");

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
