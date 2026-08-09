import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { RecipeFilters } from "@/components/modules/cardapio/RecipeFilters";
import { AddRecipeForm } from "@/components/modules/cardapio/AddRecipeForm";
import { recipeCategoryLabels } from "@/lib/labels";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string }>;

export default async function ReceitasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const where: Prisma.RecipeWhereInput = {};
  if (params.category) {
    where.category = params.category as Prisma.RecipeWhereInput["category"];
  }

  const recipes = await prisma.recipe.findMany({
    where,
    orderBy: { title: "asc" },
  });

  return (
    <>
      <Topbar title="Biblioteca de receitas" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RecipeFilters />
        </div>

        <AddRecipeForm />

        {recipes.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nenhuma receita encontrada.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-text-primary">
                    {recipe.title}
                  </p>
                  <span className="text-xs text-text-secondary">
                    {recipeCategoryLabels[recipe.category]}
                  </span>
                </div>
                {recipe.description && (
                  <p className="text-xs text-text-secondary">
                    {recipe.description}
                  </p>
                )}
                {recipe.prepTime && (
                  <p className="text-xs text-text-secondary">
                    {recipe.prepTime} min de preparo
                  </p>
                )}
                <div>
                  <p className="text-xs font-medium text-text-primary">
                    Ingredientes
                  </p>
                  <p className="text-xs text-text-secondary">
                    {recipe.ingredients}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-primary">
                    Modo de preparo
                  </p>
                  <p className="text-xs text-text-secondary">{recipe.steps}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
