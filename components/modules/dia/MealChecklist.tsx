"use client";

import { useState } from "react";
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

  async function toggle(meal: Meal) {
    const nextEaten = !meal.eaten;
    setMeals((prev) =>
      prev.map((m) =>
        m.mealType === meal.mealType ? { ...m, eaten: nextEaten } : m,
      ),
    );

    if (meal.logId) {
      await fetch(`/api/meal-logs/${meal.logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eaten: nextEaten }),
      });
    } else {
      const response = await fetch("/api/meal-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayId, mealType: meal.mealType, eaten: nextEaten }),
      });
      const log = await response.json();
      setMeals((prev) =>
        prev.map((m) =>
          m.mealType === meal.mealType ? { ...m, logId: log.id } : m,
        ),
      );
    }
  }

  return (
    <ul className="flex flex-col gap-2">
      {meals.map((meal) => (
        <li
          key={meal.mealType}
          className="flex items-center justify-between text-sm"
        >
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={meal.eaten}
              onChange={() => toggle(meal)}
              className="h-4 w-4 accent-accent"
            />
            <span className="text-text-secondary">{meal.label}</span>
          </label>
          <span
            className={cn(
              "text-text-primary",
              meal.eaten && "text-text-secondary",
            )}
          >
            {meal.recipeTitle ?? "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
