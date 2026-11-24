-- Feed: prévia do perfil do Instagram de cada cliente. Só coisa nova:
-- tabelas, colunas opcionais e valores de enum. Nada existente muda.
-- O status novo entra antes de APROVADO para ficar na ordem do fluxo.

-- AlterEnum
ALTER TYPE "ContentStatus" ADD VALUE 'AGUARDANDO_APROVACAO' BEFORE 'APROVADO';

-- AlterEnum
ALTER TYPE "ModuleType" ADD VALUE 'FEED';

-- AlterTable
ALTER TABLE "ContentPost" ADD COLUMN     "gridGroupId" TEXT,
ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "InstagramProfile" (
    "clientId" TEXT NOT NULL,
    "handle" TEXT,
    "displayName" TEXT,
    "category" TEXT,
    "bio" TEXT,
    "link" TEXT,
    "photo" TEXT,
    "postsCount" INTEGER,
    "followersCount" INTEGER,
    "followingCount" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramProfile_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "InstagramHighlight" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cover" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "InstagramHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPostCover" (
    "postId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPostCover_pkey" PRIMARY KEY ("postId")
);

-- CreateIndex
CREATE INDEX "InstagramHighlight_clientId_order_idx" ON "InstagramHighlight"("clientId", "order");

-- AddForeignKey
ALTER TABLE "InstagramProfile" ADD CONSTRAINT "InstagramProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramHighlight" ADD CONSTRAINT "InstagramHighlight_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPostCover" ADD CONSTRAINT "ContentPostCover_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

