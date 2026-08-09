-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('NORMAL', 'FAXINA');

-- CreateEnum
CREATE TYPE "Energy" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('ROTINA_NORMAL', 'ROTINA_FAXINA', 'AVULSA');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('PESSOAL', 'TAROT', 'ACE', 'CREATIVE', 'SAUDE', 'OUTRO');

-- CreateEnum
CREATE TYPE "RecipeCategory" AS ENUM ('CAFE_DA_MANHA', 'ALMOCO', 'JANTAR', 'LANCHE', 'SOBREMESA', 'OUTRO');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('CAFE_DA_MANHA', 'ALMOCO', 'JANTAR', 'LANCHE');

-- CreateEnum
CREATE TYPE "Stars" AS ENUM ('UM', 'DOIS', 'TRES', 'QUATRO', 'CINCO');

-- CreateEnum
CREATE TYPE "Block" AS ENUM ('INICIO', 'FINALIZACAO', 'RESPONDER_PESSOAS', 'EMOCIONAL', 'ENERGIA');

-- CreateEnum
CREATE TYPE "Execution" AS ENUM ('SIM', 'PARCIAL', 'NAO');

-- CreateEnum
CREATE TYPE "Quality" AS ENUM ('BEM', 'MAIS_OU_MENOS', 'DESCUIDEI');

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('SEMANAL', 'MENSAL', 'TRIMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "GoalArea" AS ENUM ('PESSOAL', 'FINANCEIRO', 'SAUDE', 'NEGOCIOS', 'ESPIRITUALIDADE', 'OUTRO');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDA', 'PAUSADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "Origin" AS ENUM ('PESSOAL', 'ACE', 'BIATRIX_TAROT', 'CREATIVE', 'CASA');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('RECEITA_VENDA', 'CONTA_FIXA', 'ASSINATURA', 'GASTO_PESSOAL', 'WEED', 'GATOS', 'ALIMENTACAO', 'CUSTO_OPERACIONAL', 'CARTAO_CREDITO', 'OUTRO');

-- CreateEnum
CREATE TYPE "PayMethod" AS ENUM ('CARTAO_CREDITO', 'PIX_DEBITO', 'DINHEIRO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "FixedBillType" AS ENUM ('ASSINATURA_PESSOAL', 'ASSINATURA_TRABALHO', 'CONTA_CASA');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PAGO', 'PENDENTE', 'ATRASADO');

-- CreateEnum
CREATE TYPE "FinancialRecordType" AS ENUM ('DIVIDA', 'INVESTIMENTO');

-- CreateEnum
CREATE TYPE "FinancialStatus" AS ENUM ('EM_ABERTO', 'PARCIAL', 'QUITADO');

-- CreateEnum
CREATE TYPE "Business" AS ENUM ('ACE', 'BIATRIX_TAROT', 'CREATIVE');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ATIVO', 'PAUSADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('QUERO_LER', 'LENDO', 'LIDO', 'PAUSADO', 'ABANDONADO');

-- CreateEnum
CREATE TYPE "KnowledgeType" AS ENUM ('VIDEO', 'ARTIGO', 'CURSO', 'PODCAST', 'POST', 'OUTRO');

-- CreateEnum
CREATE TYPE "KnowledgeArea" AS ENUM ('MARKETING', 'PROGRAMACAO', 'ESPIRITUALIDADE', 'DESIGN', 'NEGOCIOS', 'SAUDE', 'OUTRO');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('SOLTA', 'EM_ANALISE', 'VIROU_PROJETO', 'ARQUIVADA');

-- CreateEnum
CREATE TYPE "PasswordCategory" AS ENUM ('REDES_SOCIAIS', 'TRABALHO', 'FINANCEIRO', 'STREAMING', 'FERRAMENTAS', 'OUTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Day" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "DayType" NOT NULL DEFAULT 'NORMAL',
    "mood" TEXT,
    "energy" "Energy",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "habitId" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterLog" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dayId" TEXT NOT NULL,

    CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "type" "TaskType" NOT NULL DEFAULT 'AVULSA',
    "origin" "Origin" NOT NULL DEFAULT 'PESSOAL',
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dayId" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "category" "EventCategory" NOT NULL DEFAULT 'PESSOAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dayId" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "RecipeCategory" NOT NULL,
    "ingredients" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "prepTime" INTEGER,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "mealType" "MealType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipeId" TEXT,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" TEXT NOT NULL,
    "eaten" BOOLEAN NOT NULL DEFAULT false,
    "mealType" "MealType" NOT NULL,
    "notes" TEXT,
    "dayId" TEXT NOT NULL,
    "recipeId" TEXT,

    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekReview" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "effectiveness" "Stars",
    "energy" "Energy",
    "biggestBlock" "Block",
    "executedPlan" "Execution",
    "foodHydration" "Quality",
    "houseUpToDate" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "nextWeekFocus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthReviewId" TEXT,

    CONSTRAINT "WeekReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthReview" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "effectiveness" "Stars",
    "highlights" TEXT,
    "improvements" TEXT,
    "nextMonthGoal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quarterReviewId" TEXT,

    CONSTRAINT "MonthReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterReview" (
    "id" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "highlights" TEXT,
    "improvements" TEXT,
    "nextQuarterGoal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuarterReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "period" "GoalPeriod" NOT NULL,
    "area" "GoalArea" NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "origin" "Origin" NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "payMethod" "PayMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedBill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "type" "FixedBillType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedBillLog" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'PENDENTE',
    "paidAt" TIMESTAMP(3),
    "fixedBillId" TEXT NOT NULL,

    CONSTRAINT "FixedBillLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCardEntry" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "invoiceMonth" INTEGER NOT NULL,
    "invoiceYear" INTEGER NOT NULL,
    "installment" TEXT,
    "category" "TransactionCategory" NOT NULL,
    "origin" "Origin" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditCardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialRecordType" NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "installments" INTEGER,
    "dueDay" INTEGER,
    "status" "FinancialStatus" NOT NULL DEFAULT 'EM_ABERTO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "instagram" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientBusiness" (
    "id" TEXT NOT NULL,
    "business" "Business" NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'ATIVO',
    "notes" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ClientBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "cover" TEXT,
    "status" "BookStatus" NOT NULL DEFAULT 'QUERO_LER',
    "rating" INTEGER,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Knowledge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT,
    "type" "KnowledgeType" NOT NULL,
    "area" "KnowledgeArea" NOT NULL,
    "summary" TEXT,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "destination" "Origin",
    "status" "IdeaStatus" NOT NULL DEFAULT 'SOLTA',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordEntry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "login" TEXT,
    "password" TEXT NOT NULL,
    "url" TEXT,
    "category" "PasswordCategory" NOT NULL DEFAULT 'OUTRO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Day_date_key" ON "Day"("date");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_dayId_key" ON "HabitLog"("habitId", "dayId");

-- CreateIndex
CREATE UNIQUE INDEX "FixedBillLog_fixedBillId_month_year_key" ON "FixedBillLog"("fixedBillId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ClientBusiness_clientId_business_key" ON "ClientBusiness"("clientId", "business");

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekReview" ADD CONSTRAINT "WeekReview_monthReviewId_fkey" FOREIGN KEY ("monthReviewId") REFERENCES "MonthReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthReview" ADD CONSTRAINT "MonthReview_quarterReviewId_fkey" FOREIGN KEY ("quarterReviewId") REFERENCES "QuarterReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedBillLog" ADD CONSTRAINT "FixedBillLog_fixedBillId_fkey" FOREIGN KEY ("fixedBillId") REFERENCES "FixedBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientBusiness" ADD CONSTRAINT "ClientBusiness_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
