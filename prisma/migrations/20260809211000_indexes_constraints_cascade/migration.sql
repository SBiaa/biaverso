-- Índices, constraints de unicidade e deleção em cascata.
--
-- 1. Não havia nenhum índice não-único no banco: toda coluna de FK e de filtro
--    fazia sequential scan.
-- 2. Vários `findFirst` + `create` não tinham unique constraint por trás, então
--    duas abas abertas conseguiam criar registros duplicados.
-- 3. Sem ON DELETE CASCADE, deletar Negócio/Cliente/Projeto era impossível e todo
--    delete precisava de um $transaction manual encadeando deleteMany.

-- ---------------------------------------------------------------- duplicados
-- Precisa rodar antes das unique constraints. Só para tabelas sem texto livre:
-- um log/plano de refeição duplicado é ruído, não conteúdo.
DELETE FROM "MealLog" a USING "MealLog" b
WHERE a.ctid > b.ctid AND a."dayId" = b."dayId" AND a."mealType" = b."mealType";

DELETE FROM "MealPlan" a USING "MealPlan" b
WHERE a.ctid > b.ctid
  AND a."weekStart" = b."weekStart"
  AND a."dayOfWeek" = b."dayOfWeek"
  AND a."mealType" = b."mealType";

-- As avaliações guardam texto escrito à mão, então aqui a migration para e avisa
-- em vez de escolher sozinha qual versão descartar.
DO $$
DECLARE dups int;
BEGIN
  SELECT count(*) INTO dups FROM (
    SELECT 1 FROM "WeekReview" GROUP BY "weekStart" HAVING count(*) > 1
    UNION ALL
    SELECT 1 FROM "MonthReview" GROUP BY "month", "year" HAVING count(*) > 1
    UNION ALL
    SELECT 1 FROM "QuarterReview" GROUP BY "quarter", "year" HAVING count(*) > 1
  ) d;
  IF dups > 0 THEN
    RAISE EXCEPTION 'Existem % avaliações duplicadas (semana/mês/trimestre). Junte o texto das duplicadas à mão e apague as sobras antes de rodar esta migration.', dups;
  END IF;
END $$;

-- ------------------------------------------------------------------ unicidade
CREATE UNIQUE INDEX "MealPlan_weekStart_dayOfWeek_mealType_key" ON "MealPlan"("weekStart", "dayOfWeek", "mealType");
CREATE UNIQUE INDEX "MealLog_dayId_mealType_key" ON "MealLog"("dayId", "mealType");
CREATE UNIQUE INDEX "WeekReview_weekStart_key" ON "WeekReview"("weekStart");
CREATE UNIQUE INDEX "MonthReview_month_year_key" ON "MonthReview"("month", "year");
CREATE UNIQUE INDEX "QuarterReview_quarter_year_key" ON "QuarterReview"("quarter", "year");

-- -------------------------------------------------------------------- índices
CREATE INDEX "WaterLog_dayId_idx" ON "WaterLog"("dayId");
CREATE INDEX "Task_dayId_idx" ON "Task"("dayId");
CREATE INDEX "Task_businessId_idx" ON "Task"("businessId");
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");
CREATE INDEX "Task_type_dayId_idx" ON "Task"("type", "dayId");
CREATE INDEX "Event_dayId_idx" ON "Event"("dayId");
CREATE INDEX "Event_date_idx" ON "Event"("date");
CREATE INDEX "MealPlan_recipeId_idx" ON "MealPlan"("recipeId");
CREATE INDEX "MealLog_recipeId_idx" ON "MealLog"("recipeId");
CREATE INDEX "WeekReview_monthReviewId_idx" ON "WeekReview"("monthReviewId");
CREATE INDEX "MonthReview_quarterReviewId_idx" ON "MonthReview"("quarterReviewId");
CREATE INDEX "Goal_measuredGoalId_idx" ON "Goal"("measuredGoalId");
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_type_date_idx" ON "Transaction"("type", "date");
CREATE INDEX "Transaction_businessId_idx" ON "Transaction"("businessId");
CREATE INDEX "FixedBillLog_year_month_status_idx" ON "FixedBillLog"("year", "month", "status");
CREATE INDEX "CreditCardPurchase_businessId_idx" ON "CreditCardPurchase"("businessId");
CREATE INDEX "CreditCardEntry_invoiceYear_invoiceMonth_idx" ON "CreditCardEntry"("invoiceYear", "invoiceMonth");
CREATE INDEX "CreditCardEntry_businessId_idx" ON "CreditCardEntry"("businessId");
CREATE INDEX "CreditCardEntry_purchaseId_idx" ON "CreditCardEntry"("purchaseId");
CREATE INDEX "Project_businessId_idx" ON "Project"("businessId");
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");
CREATE INDEX "ClientBusiness_businessId_status_idx" ON "ClientBusiness"("businessId", "status");
CREATE INDEX "ContentPost_businessId_status_idx" ON "ContentPost"("businessId", "status");
CREATE INDEX "ContentPost_businessId_publishDate_idx" ON "ContentPost"("businessId", "publishDate");
CREATE INDEX "ContentPost_clientId_idx" ON "ContentPost"("clientId");
CREATE INDEX "ContentPost_projectId_idx" ON "ContentPost"("projectId");
CREATE INDEX "ProductionTask_businessId_status_idx" ON "ProductionTask"("businessId", "status");
CREATE INDEX "ProductionTask_businessId_dueDate_idx" ON "ProductionTask"("businessId", "dueDate");
CREATE INDEX "ProductionTask_dueDate_status_idx" ON "ProductionTask"("dueDate", "status");
CREATE INDEX "ProductionTask_clientId_idx" ON "ProductionTask"("clientId");
CREATE INDEX "ProductionTask_projectId_idx" ON "ProductionTask"("projectId");
CREATE INDEX "Idea_businessId_idx" ON "Idea"("businessId");
CREATE INDEX "Principle_pillarId_idx" ON "Principle"("pillarId");
CREATE INDEX "ConceptualGoal_pillarId_idx" ON "ConceptualGoal"("pillarId");
CREATE INDEX "MeasuredGoal_conceptualGoalId_idx" ON "MeasuredGoal"("conceptualGoalId");
CREATE INDEX "MeasuredGoal_status_idx" ON "MeasuredGoal"("status");
CREATE INDEX "Desire_pillarId_idx" ON "Desire"("pillarId");
CREATE INDEX "MoodboardItem_pillarId_order_idx" ON "MoodboardItem"("pillarId", "order");

-- ------------------------------------------------------ deleção em cascata
-- Filhos que não fazem sentido sem o pai. As relações opcionais já eram
-- SET NULL por padrão do Prisma e ficam como estão.
ALTER TABLE "HabitLog" DROP CONSTRAINT "HabitLog_habitId_fkey",
  ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HabitLog" DROP CONSTRAINT "HabitLog_dayId_fkey",
  ADD CONSTRAINT "HabitLog_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaterLog" DROP CONSTRAINT "WaterLog_dayId_fkey",
  ADD CONSTRAINT "WaterLog_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealLog" DROP CONSTRAINT "MealLog_dayId_fkey",
  ADD CONSTRAINT "MealLog_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" DROP CONSTRAINT "Task_dayId_fkey",
  ADD CONSTRAINT "Task_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" DROP CONSTRAINT "Event_dayId_fkey",
  ADD CONSTRAINT "Event_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedBillLog" DROP CONSTRAINT "FixedBillLog_fixedBillId_fkey",
  ADD CONSTRAINT "FixedBillLog_fixedBillId_fkey" FOREIGN KEY ("fixedBillId") REFERENCES "FixedBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditCardEntry" DROP CONSTRAINT "CreditCardEntry_purchaseId_fkey",
  ADD CONSTRAINT "CreditCardEntry_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "CreditCardPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" DROP CONSTRAINT "Project_businessId_fkey",
  ADD CONSTRAINT "Project_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientBusiness" DROP CONSTRAINT "ClientBusiness_businessId_fkey",
  ADD CONSTRAINT "ClientBusiness_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientBusiness" DROP CONSTRAINT "ClientBusiness_clientId_fkey",
  ADD CONSTRAINT "ClientBusiness_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentPost" DROP CONSTRAINT "ContentPost_businessId_fkey",
  ADD CONSTRAINT "ContentPost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentPost" DROP CONSTRAINT "ContentPost_clientId_fkey",
  ADD CONSTRAINT "ContentPost_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionTask" DROP CONSTRAINT "ProductionTask_businessId_fkey",
  ADD CONSTRAINT "ProductionTask_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionTask" DROP CONSTRAINT "ProductionTask_clientId_fkey",
  ADD CONSTRAINT "ProductionTask_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptualGoal" DROP CONSTRAINT "ConceptualGoal_pillarId_fkey",
  ADD CONSTRAINT "ConceptualGoal_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "Pillar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeasuredGoal" DROP CONSTRAINT "MeasuredGoal_conceptualGoalId_fkey",
  ADD CONSTRAINT "MeasuredGoal_conceptualGoalId_fkey" FOREIGN KEY ("conceptualGoalId") REFERENCES "ConceptualGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MoodboardItem" DROP CONSTRAINT "MoodboardItem_pillarId_fkey",
  ADD CONSTRAINT "MoodboardItem_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "Pillar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
