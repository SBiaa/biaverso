"use client";

import { useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/cardapio";
import { mealTypeLabels } from "@/lib/labels";
import { RecipePickerModal } from "./RecipePickerModal";

const MEAL_TYPES = ["CAFE_DA_MANHA", "ALMOCO", "JANTAR"] as const;

type Recipe = { id: string; title: string; category: string };

type PlanEntry = {
  dayOfWeek: number;
  mealType: string;
  recipeId: string | null;
  recipeTitle: string | null;
};

type WeeklyMealGridProps = {
  weekStart: string;
  recipes: Recipe[];
  initialPlan: PlanEntry[];
};

function planKey(dayOfWeek: number, mealType: string) {
  return `${dayOfWeek}-${mealType}`;
}

export function WeeklyMealGrid({
  weekStart,
  recipes,
  initialPlan,
}: WeeklyMealGridProps) {
  const [plan, setPlan] = useState<Record<string, { id: string; title: string } | null>>(
    () => {
      const map: Record<string, { id: string; title: string } | null> = {};
      for (const entry of initialPlan) {
        map[planKey(entry.dayOfWeek, entry.mealType)] = entry.recipeId
          ? { id: entry.recipeId, title: entry.recipeTitle ?? "" }
          : null;
      }
      return map;
    },
  );
  const [active, setActive] = useState<{ dayOfWeek: number; mealType: string } | null>(
    null,
  );

  async function handleSelect(recipeId: string | null) {
    if (!active) return;
    const key = planKey(active.dayOfWeek, active.mealType);
    const recipe = recipeId ? recipes.find((r) => r.id === recipeId) ?? null : null;
    setPlan((prev) => ({
      ...prev,
      [key]: recipe ? { id: recipe.id, title: recipe.title } : null,
    }));
    setActive(null);
    await fetch("/api/meal-plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart,
        dayOfWeek: active.dayOfWeek,
        mealType: active.mealType,
        recipeId,
      }),
    });
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-7 gap-2">
        {WEEKDAY_LABELS.map((label, dayOfWeek) => (
          <div key={label} className="flex flex-col gap-2">
            <p className="text-center text-sm font-semibold text-text-primary">
              {label}
            </p>
            {MEAL_TYPES.map((mealType) => {
              const entry = plan[planKey(dayOfWeek, mealType)];
              return (
                <button
                  key={mealType}
                  type="button"
                  onClick={() => setActive({ dayOfWeek, mealType })}
                  className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface p-2 text-left hover:bg-black/[0.03]"
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">
                    {mealTypeLabels[mealType]}
                  </span>
                  <span className="text-xs text-text-primary">
                    {entry?.title || "—"}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {active && (
        <RecipePickerModal
          recipes={recipes}
          onSelect={handleSelect}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
