-- Capa do negócio (imagem do topo, como a capa de uma página do Notion).
-- Tabela própria, e não coluna em Business: a imagem tem dezenas de KB e
-- várias telas listam negócios sem `select`. Só tabela nova: nada muda.

-- CreateTable
CREATE TABLE "BusinessCover" (
    "businessId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCover_pkey" PRIMARY KEY ("businessId")
);

-- AddForeignKey
ALTER TABLE "BusinessCover" ADD CONSTRAINT "BusinessCover_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
