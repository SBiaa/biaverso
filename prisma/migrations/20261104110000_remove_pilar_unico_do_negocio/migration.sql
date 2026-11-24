-- O pilar do negócio agora mora em "_BusinessToPillar" (migration anterior).
-- Rodar só depois que o código novo estiver no ar.

-- DropForeignKey
ALTER TABLE "Business" DROP CONSTRAINT "Business_pillarId_fkey";

-- DropIndex
DROP INDEX "Business_pillarId_idx";

-- AlterTable
ALTER TABLE "Business" DROP COLUMN "pillarId";
