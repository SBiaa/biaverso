import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { RecipeFilters } from "@/components/modules/cardapio/RecipeFilters";
import { AddRecipeForm } from "@/components/modules/cardapio/AddRecipeForm";
import { RecipeCard } from "@/components/modules/cardapio/RecipeCard";
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

  const recipesRaw = await prisma.recipe.findMany({
    where,
    orderBy: { title: "asc" },
    include: { _count: { select: { mealPlans: true } } },
  });
  const recipes = recipesRaw.map((r) => ({
    ...r,
    mealPlansCount: r._count.mealPlans,
  }));

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
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
