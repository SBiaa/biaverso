-- Diário de desenvolvimento dos projetos: entradas com data, tipo, versão e link.

-- CreateEnum
CREATE TYPE "DevLogKind" AS ENUM ('FUNCIONALIDADE', 'MELHORIA', 'CORRECAO', 'LANCAMENTO', 'DECISAO', 'NOTA');

-- CreateTable
CREATE TABLE "ProjectLogEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "DevLogKind" NOT NULL DEFAULT 'FUNCIONALIDADE',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "version" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectLogEntry_projectId_date_idx" ON "ProjectLogEntry"("projectId", "date");

-- AddForeignKey
ALTER TABLE "ProjectLogEntry" ADD CONSTRAINT "ProjectLogEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
