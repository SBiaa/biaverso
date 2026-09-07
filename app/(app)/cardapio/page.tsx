import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getWeekStart } from "@/lib/cardapio";
import { getShoppingList, recipeLibraryInclude, toRecipeView } from "@/lib/receitas";
import { parseDateOnly, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { itemGrid } from "@/components/layout/page-width";
import { WeekPicker } from "@/components/modules/cardapio/WeekPicker";
import { WeeklyMealGrid } from "@/components/modules/cardapio/WeeklyMealGrid";
import { RecipeFilters } from "@/components/modules/cardapio/RecipeFilters";
import { NewRecipeButton } from "@/components/modules/cardapio/RecipeForm";
import { RecipeCard } from "@/components/modules/cardapio/RecipeCard";
import { ShoppingList } from "@/components/modules/cardapio/ShoppingList";
import { CardTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string; semana?: string; pronto?: string }>;

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

  const [recipeRows, mealPlans, pantry, shopping] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { title: "asc" },
      include: recipeLibraryInclude,
    }),
    prisma.mealPlan.findMany({
      where: { weekStart },
      include: { recipe: { select: { title: true } } },
    }),
    prisma.ingredient.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, inStock: true },
    }),
    getShoppingList(weekStart),
  ]);

  const recipes = recipeRows.map(toRecipeView);

  const initialPlan = mealPlans.map((plan) => ({
    dayOfWeek: plan.dayOfWeek,
    mealType: plan.mealType,
    recipeId: plan.recipeId,
    recipeTitle: plan.recipe?.title ?? null,
  }));

  // O filtro é só da biblioteca: o seletor da grade continua oferecendo todas
  // as receitas, senão filtrar a lista de baixo tirava opções do planejamento.
  const onlyReady = params.pronto === "1";
  const library = recipes.filter(
    (recipe) =>
      (!params.category || recipe.categories.includes(params.category)) &&
      (!onlyReady || (recipe.items.length > 0 && recipe.missing === 0)),
  );

  return (
    <>
      <Topbar
        title="Cardápio"
        action={
          <Link
            href="/cardapio/despensa"
            className="text-sm font-medium text-accent hover:underline"
          >
            Despensa
          </Link>
        }
      />
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
              categories: r.categories,
              missing: r.items.length > 0 ? r.missing : -1,
            }))}
            initialPlan={initialPlan}
            isCurrentWeek={isCurrentWeek}
          />
        </section>

        <ShoppingList
          // Trocar a semana troca a lista; sem a key a marcação otimista da
          // semana anterior podia vazar para a nova.
          key={`compras-${weekStart.toISOString()}`}
          items={shopping.items}
          total={shopping.total}
          hasPlans={mealPlans.some((plan) => plan.recipeId)}
        />

        {/* A biblioteca era outra página, atrás de um link no topo. Aqui
            embaixo ela fica junto de onde a receita é usada. */}
        <section id="receitas" className="space-y-4 border-t border-border pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>
              Biblioteca de receitas
              <span className="ml-2 font-normal text-text-secondary">
                {recipes.length}
              </span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <RecipeFilters />
              <NewRecipeButton pantry={pantry} />
            </div>
          </div>

          {library.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {recipes.length === 0
                ? "Nenhuma receita cadastrada ainda."
                : onlyReady
                  ? "Nenhuma receita dá pra fazer só com o que tem em casa."
                  : "Nenhuma receita para essa refeição."}
            </p>
          ) : (
            <div className={itemGrid}>
              {library.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} pantry={pantry} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
