-- Preferências do app — hoje só a meta de água, que era fixa em 8 × 300ml.
-- Registro único, como o CreditCard: a linha nasce no primeiro salvamento.

CREATE TABLE "UserSettings" (
  "id" TEXT NOT NULL,
  "waterGoal" INTEGER NOT NULL DEFAULT 8,
  "waterUnitMl" INTEGER NOT NULL DEFAULT 300,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);
