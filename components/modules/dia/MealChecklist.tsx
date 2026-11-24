"use client";

import { ErrorNote } from "@/components/ui";
import { useOptimisticList } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { MealType } from "@/app/generated/prisma/client";

type Meal = {
  mealType: MealType;
  label: string;
  recipeTitle: string | null;
  logId: string | null;
  eaten: boolean;
};

type MealChecklistProps = {
  dayId: string;
  initialMeals: Meal[];
};

export function MealChecklist({ dayId, initialMeals }: MealChecklistProps) {
  // A refeição não tem `id` próprio quando ainda não foi marcada nenhuma vez;
  // o tipo (café, almoço, janta) é o que identifica a linha.
  const { items: meals, error, update } = useOptimisticList(
    initialMeals.map((meal) => ({ ...meal, id: meal.mealType })),
  );

  function toggle(meal: Meal & { id: string }) {
    const eaten = !meal.eaten;
    update(meal.id, { eaten }, () =>
      meal.logId
        ? api.patch(`/api/meal-logs/${meal.logId}`, { eaten })
        : // O POST é um upsert no servidor, então clicar duas vezes rápido não
          // cria dois logs para a mesma refeição. O `logId` novo chega pelo
          // refresh que o hook dispara no fim.
          api.post("/api/meal-logs", { dayId, mealType: meal.mealType, eaten }),
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-2">
        {meals.map((meal) => (
          <li key={meal.id} className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={meal.eaten}
                onChange={() => toggle(meal)}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-text-secondary">{meal.label}</span>
            </label>
            <span className={cn("text-text-primary", meal.eaten && "text-text-secondary")}>
              {meal.recipeTitle ?? "—"}
            </span>
          </li>
        ))}
      </ul>
      <ErrorNote message={error} />
    </div>
  );
}
