import { prisma } from "@/lib/prisma";
import { getWeekStart } from "@/lib/cardapio";
import { parseDateOnly, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { WeekPicker } from "@/components/modules/cardapio/WeekPicker";
import { WeeklyMealGrid } from "@/components/modules/cardapio/WeeklyMealGrid";
import { RecipeFilters } from "@/components/modules/cardapio/RecipeFilters";
import { AddRecipeForm } from "@/components/modules/cardapio/AddRecipeForm";
import { RecipeCard } from "@/components/modules/cardapio/RecipeCard";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string; semana?: string }>;

export default async function CardapioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  // Semana inválida na URL cai na de hoje. `getWeekStart` normaliza qualquer
  // dia para a segunda, então um link no meio da semana também funciona.
  const chosen = params.semana ? parseDateOnly(params.semana) : null;
  const weekStart = getWeekStart(chosen ?? todayUtc());
  // Estar na semana de hoje é o que autoriza a grade a se atualizar sozinha
  // na virada; numa semana escolhida a mão, ela fica onde foi posta.
  const isCurrentWeek = weekStart.getTime() === getWeekStart(todayUtc()).getTime();

  const [recipes, mealPlans] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { title: "asc" },
      include: { _count: { select: { mealPlans: true } } },
    }),
    prisma.mealPlan.findMany({
      where: { weekStart },
      include: { recipe: true },
    }),
  ]);

  const initialPlan = mealPlans.map((plan) => ({
    dayOfWeek: plan.dayOfWeek,
    mealType: plan.mealType,
    recipeId: plan.recipeId,
    recipeTitle: plan.recipe?.title ?? null,
  }));

  // O filtro é só da biblioteca: o seletor da grade continua oferecendo todas
  // as receitas, senão filtrar a lista de baixo tirava opções do planejamento.
  const library = params.category
    ? recipes.filter((recipe) => recipe.category === params.category)
    : recipes;

  return (
    <>
      <Topbar title="Cardápio" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-6 px-4 py-5 md:px-8 md:py-8 md:space-y-8">
        <section className="flex flex-col gap-3">
          <WeekPicker
            weekStart={weekStart.toISOString()}
            isCurrentWeek={isCurrentWeek}
          />
          <WeeklyMealGrid
            // Trocou a semana, troca a grade: sem a key o React manteria o
            // estado antigo e a semana nova nasceria com a comida da anterior.
            key={weekStart.toISOString()}
            weekStart={weekStart.toISOString()}
            recipes={recipes.map((r) => ({
              id: r.id,
              title: r.title,
              category: r.category,
            }))}
            initialPlan={initialPlan}
            isCurrentWeek={isCurrentWeek}
          />
        </section>

        {/* A biblioteca era outra página, atrás de um link no topo. Aqui
            embaixo ela fica junto de onde a receita é usada. */}
        <section id="receitas" className="space-y-4 border-t border-border pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Biblioteca de receitas
              <span className="ml-2 font-normal text-text-secondary">
                {recipes.length}
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <RecipeFilters />
              <AddRecipeForm />
            </div>
          </div>

          {library.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {recipes.length === 0
                ? "Nenhuma receita cadastrada ainda."
                : "Nenhuma receita nessa categoria."}
            </p>
          ) : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
              {library.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={{ ...recipe, mealPlansCount: recipe._count.mealPlans }}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
