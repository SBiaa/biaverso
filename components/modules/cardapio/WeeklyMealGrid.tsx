"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNote } from "@/components/ui";
import { addUtcDays, cn } from "@/lib/utils";
import { api, errorMessage } from "@/lib/client-api";
import {
  WEEKDAY_LABELS,
  currentWeekStartISO,
  todayIndexInWeek,
} from "@/lib/cardapio";
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
  /**
   * Só a grade da semana de hoje vigia o relógio. Quando ela navega de
   * propósito para outra semana, nada pode arrastá-la de volta.
   */
  isCurrentWeek: boolean;
};

function planKey(dayOfWeek: number, mealType: string) {
  return `${dayOfWeek}-${mealType}`;
}

export function WeeklyMealGrid({
  weekStart,
  recipes,
  initialPlan,
  isCurrentWeek,
}: WeeklyMealGridProps) {
  const router = useRouter();
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
  const [error, setError] = useState<string | null>(null);

  // A tela fica aberta no celular por dias. Sem isto, na segunda-feira ela
  // continuava mostrando (e gravando em) a semana que já passou, porque nada
  // pede ao servidor uma renderização nova. Ao voltar para a aba, ou de minuto
  // em minuto, comparamos o relógio com a semana que está na tela.
  useEffect(() => {
    if (!isCurrentWeek) return;

    function checkWeek() {
      if (currentWeekStartISO() !== weekStart) router.refresh();
    }

    const timer = setInterval(checkWeek, 60_000);
    window.addEventListener("focus", checkWeek);
    document.addEventListener("visibilitychange", checkWeek);
    checkWeek();

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", checkWeek);
      document.removeEventListener("visibilitychange", checkWeek);
    };
  }, [weekStart, isCurrentWeek, router]);

  async function handleSelect(recipeId: string | null) {
    if (!active) return;
    // Virou a semana com o modal aberto: gravar aqui escreveria na semana
    // velha. Busca a nova e descarta o clique. (Planejar outra semana de
    // propósito continua valendo — só o "hoje" congelado é problema.)
    if (isCurrentWeek && currentWeekStartISO() !== weekStart) {
      setActive(null);
      router.refresh();
      return;
    }

    const key = planKey(active.dayOfWeek, active.mealType);
    const recipe = recipeId ? recipes.find((r) => r.id === recipeId) ?? null : null;
    const previous = plan;
    setPlan((prev) => ({
      ...prev,
      [key]: recipe ? { id: recipe.id, title: recipe.title } : null,
    }));
    const slot = active;
    setActive(null);
    setError(null);

    try {
      await api.put("/api/meal-plans", {
        weekStart,
        dayOfWeek: slot.dayOfWeek,
        mealType: slot.mealType,
        recipeId,
      });
    } catch (e) {
      setPlan(previous);
      setError(errorMessage(e));
    }
  }

  const weekStartDate = new Date(weekStart);
  const todayIndex = todayIndexInWeek(weekStart);

  return (
    <>
      <div className="overflow-x-auto">
        <ErrorNote message={error} />
        <div className="grid min-w-[720px] grid-cols-7 gap-2">
          {WEEKDAY_LABELS.map((label, dayOfWeek) => {
            const isToday = dayOfWeek === todayIndex;
            return (
              <div key={label} className="flex flex-col gap-2">
                {/* O dia do mês embaixo do rótulo é o que deixa claro qual
                    semana está na tela — "Seg" sozinho servia para qualquer uma. */}
                <p
                  className={cn(
                    "text-center text-sm font-semibold",
                    isToday ? "text-accent" : "text-text-primary",
                  )}
                >
                  {label}{" "}
                  <span className="font-normal">
                    {addUtcDays(weekStartDate, dayOfWeek).getUTCDate()}
                  </span>
                </p>
                {MEAL_TYPES.map((mealType) => {
                  const entry = plan[planKey(dayOfWeek, mealType)];
                  return (
                    <button
                      key={mealType}
                      type="button"
                      onClick={() => setActive({ dayOfWeek, mealType })}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-lg border bg-surface p-2 text-left hover:bg-black/[0.03]",
                        isToday ? "border-accent/40" : "border-border",
                      )}
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
            );
          })}
        </div>
      </div>

      {active && (
        <RecipePickerModal
          recipes={recipes}
          onSelect={handleSelect}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}
