-- Página de planejamento do ano.
CREATE TABLE "YearPlan" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "word" TEXT,
    "retro" JSONB NOT NULL DEFAULT '{}',
    "pillarNotes" JSONB NOT NULL DEFAULT '{}',
    "dates" JSONB NOT NULL DEFAULT '[]',
    "incomeTarget" DOUBLE PRECISION,
    "savingsTarget" DOUBLE PRECISION,
    "budgetNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "YearPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "YearPlan_year_key" ON "YearPlan"("year");
