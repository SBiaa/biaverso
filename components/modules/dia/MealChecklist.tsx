"use client";

import { useState } from "react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
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
  const [meals, setMeals] = useState(initialMeals);
  const [error, setError] = useState<string | null>(null);

  async function toggle(meal: Meal) {
    const previous = meals;
    const nextEaten = !meal.eaten;

    setError(null);
    setMeals((prev) =>
      prev.map((m) => (m.mealType === meal.mealType ? { ...m, eaten: nextEaten } : m)),
    );

    try {
      if (meal.logId) {
        await api.patch(`/api/meal-logs/${meal.logId}`, { eaten: nextEaten });
      } else {
        // O POST é um upsert no servidor, então clicar duas vezes rápido não
        // cria dois logs para a mesma refeição.
        const log = await api.post<{ id: string }>("/api/meal-logs", {
          dayId,
          mealType: meal.mealType,
          eaten: nextEaten,
        });
        setMeals((prev) =>
          prev.map((m) => (m.mealType === meal.mealType ? { ...m, logId: log.id } : m)),
        );
      }
    } catch (e) {
      setMeals(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-2">
        {meals.map((meal) => (
          <li key={meal.mealType} className="flex items-center justify-between text-sm">
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
