-- Uma receita pode servir a mais de uma refeição (almoço E janta, café E
-- lanche): a categoria única vira lista. Cada receita leva junto a categoria
-- que já tinha, em vez de perder o valor no drop/add que o Prisma gerou.
ALTER TABLE "Recipe" ADD COLUMN "categories" "RecipeCategory"[] DEFAULT ARRAY[]::"RecipeCategory"[];
UPDATE "Recipe" SET "categories" = ARRAY["category"];
ALTER TABLE "Recipe" DROP COLUMN "category";

-- Os ingredientes passam a ser itens ligados à despensa. O texto livre antigo
-- continua guardado (agora opcional) para as receitas já cadastradas.
ALTER TABLE "Recipe" RENAME COLUMN "ingredients" TO "ingredientsText";
ALTER TABLE "Recipe" ALTER COLUMN "ingredientsText" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX "RecipeIngredient_ingredientId_idx" ON "RecipeIngredient"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeIngredient_recipeId_ingredientId_key" ON "RecipeIngredient"("recipeId", "ingredientId");

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
