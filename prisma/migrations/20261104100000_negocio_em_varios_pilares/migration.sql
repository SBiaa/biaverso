-- Negócio passa a poder estar em vários pilares (muitos-para-muitos).
-- A coluna antiga "Business"."pillarId" fica por enquanto, para a versão que
-- ainda está no ar continuar funcionando; ela sai na migration seguinte.

-- CreateTable
CREATE TABLE "_BusinessToPillar" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BusinessToPillar_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BusinessToPillar_B_index" ON "_BusinessToPillar"("B");

-- AddForeignKey
ALTER TABLE "_BusinessToPillar" ADD CONSTRAINT "_BusinessToPillar_A_fkey" FOREIGN KEY ("A") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessToPillar" ADD CONSTRAINT "_BusinessToPillar_B_fkey" FOREIGN KEY ("B") REFERENCES "Pillar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copia o pilar que cada negócio já tinha.
INSERT INTO "_BusinessToPillar" ("A", "B")
SELECT "id", "pillarId" FROM "Business" WHERE "pillarId" IS NOT NULL;
