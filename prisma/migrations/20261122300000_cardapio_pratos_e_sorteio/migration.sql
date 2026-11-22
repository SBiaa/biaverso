-- Despensa por tipo e "sempre tenho"; papel do ingrediente no prato; opção
-- escolhida no plano da semana; modo de preparo opcional.
CREATE TYPE "IngredientKind" AS ENUM ('PROTEINA', 'CARBOIDRATO', 'LEGUME_VERDURA', 'LATICINIO', 'TEMPERO_BASICO', 'OUTRO');
CREATE TYPE "IngredientRole" AS ENUM ('PRECISA', 'OPCAO', 'OPCIONAL');

ALTER TABLE "Ingredient" ADD COLUMN "kind" "IngredientKind" NOT NULL DEFAULT 'OUTRO',
ADD COLUMN "alwaysHave" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RecipeIngredient" ADD COLUMN "role" "IngredientRole" NOT NULL DEFAULT 'PRECISA';

ALTER TABLE "Recipe" ALTER COLUMN "steps" DROP NOT NULL;

ALTER TABLE "MealPlan" ADD COLUMN "optionIngredientId" TEXT;
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_optionIngredientId_fkey" FOREIGN KEY ("optionIngredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
