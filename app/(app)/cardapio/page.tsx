import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getWeekStart } from "@/lib/cardapio";
import { todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { WeeklyMealGrid } from "@/components/modules/cardapio/WeeklyMealGrid";

export const dynamic = "force-dynamic";

export default async function CardapioPage() {
  const weekStart = getWeekStart(todayUtc());

  const [recipes, mealPlans] = await Promise.all([
    prisma.recipe.findMany({ orderBy: { title: "asc" } }),
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

  return (
    <>
      <Topbar
        title="Cardápio"
        action={
          <Link
            href="/cardapio/receitas"
            className="text-sm font-medium text-accent"
          >
            Biblioteca de receitas
          </Link>
        }
      />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <Link
          href="/cardapio/receitas"
          className="text-sm font-medium text-accent md:hidden"
        >
          Biblioteca de receitas
        </Link>
        <WeeklyMealGrid
          weekStart={weekStart.toISOString()}
          recipes={recipes.map((r) => ({ id: r.id, title: r.title, category: r.category }))}
          initialPlan={initialPlan}
        />
      </main>
    </>
  );
}
