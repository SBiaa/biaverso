-- CreateEnum
CREATE TYPE "ContentPilar" AS ENUM ('AUTORIDADE', 'PROVA', 'OFERTA', 'HUMANO', 'CONVERSA');

-- AlterTable
ALTER TABLE "ContentPost" ADD COLUMN     "cta" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT,
ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hook" TEXT,
ADD COLUMN     "objective" TEXT,
ADD COLUMN     "pilar" "ContentPilar",
ADD COLUMN     "script" JSONB,
ADD COLUMN     "slides" JSONB,
ADD COLUMN     "storySupport" TEXT,
ADD COLUMN     "visualBrief" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "ContentPost_businessId_externalSource_externalId_key" ON "ContentPost"("businessId", "externalSource", "externalId");

