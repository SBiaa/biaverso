-- CreateEnum
CREATE TYPE "CycleFlow" AS ENUM ('BORRIFO', 'LEVE', 'MODERADO', 'INTENSO');

-- CreateEnum
CREATE TYPE "CycleSymptom" AS ENUM ('COLICA', 'DOR_CABECA', 'INCHACO', 'SENSIBILIDADE_MAMAS', 'ACNE', 'CANSACO', 'ENJOO', 'DOR_COSTAS', 'INSONIA', 'APETITE_AUMENTADO', 'LIBIDO_ALTA', 'OUTRO');

-- CreateEnum
CREATE TYPE "CycleMood" AS ENUM ('OTIMO', 'BEM', 'NORMAL', 'IRRITADA', 'SENSIVEL', 'ANSIOSA', 'TRISTE');

-- CreateTable
CREATE TABLE "CycleLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "flow" "CycleFlow",
    "symptoms" "CycleSymptom"[] DEFAULT ARRAY[]::"CycleSymptom"[],
    "mood" "CycleMood",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CycleLog_date_key" ON "CycleLog"("date");

-- CreateIndex
CREATE INDEX "CycleLog_date_idx" ON "CycleLog"("date");
