"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dices } from "lucide-react";
import { Button, ErrorNote, notify } from "@/components/ui";
import { addUtcDays, cn } from "@/lib/utils";
import { api, errorMessage } from "@/lib/client-api";
import {
  WEEKDAY_LABELS,
  currentWeekStartISO,
  todayIndexInWeek,
} from "@/lib/cardapio";
import { mealTypeLabels } from "@/lib/labels";
import { mealTitle, recipeStatus, type RecipeView } from "@/lib/pratos";
import { SLOT_MEALS, slotKey, type Slot, type SlotPlan } from "@/lib/sorteio";
import { RecipePickerModal } from "./RecipePickerModal";
import { SorteioSemanaModal } from "./SorteioSemanaModal";

/** "Preencher a semana" cuida das refeições principais; o café fica a mão. */
const FILL_MEALS = ["ALMOCO", "JANTAR"];

export type PlanEntry = {
  dayOfWeek: number;
  mealType: string;
  recipeId: string | null;
  optionIngredientId: string | null;
};

type WeeklyMealGridProps = {
  weekStart: string;
  recipes: RecipeView[];
  initialPlan: PlanEntry[];
  /** A semana anterior, só para o sorteio saber o que veio antes de segunda. */
  previousPlan: PlanEntry[];
  /**
   * Só a grade da semana de hoje vigia o relógio. Quando ela navega de
   * propósito para outra semana, nada pode arrastá-la de volta.
   */
  isCurrentWeek: boolean;
};

function planKey(dayOfWeek: number, mealType: string) {
  return slotKey({ day: dayOfWeek, mealType });
}

function toMap(entries: PlanEntry[], dayOffset = 0) {
  const map = new Map<string, SlotPlan>();
  for (const entry of entries) {
    if (!entry.recipeId) continue;
    map.set(planKey(entry.dayOfWeek + dayOffset, entry.mealType), {
      recipeId: entry.recipeId,
      optionIngredientId: entry.optionIngredientId,
    });
  }
  return map;
}

export function WeeklyMealGrid({
  weekStart,
  recipes,
  initialPlan,
  previousPlan,
  isCurrentWeek,
}: WeeklyMealGridProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<Record<string, SlotPlan | null>>(() =>
    Object.fromEntries(toMap(initialPlan)),
  );
  const [active, setActive] = useState<{ dayOfWeek: number; mealType: string } | null>(
    null,
  );
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = new Map(recipes.map((r) => [r.id, r]));

  /** O que o sorteio enxerga: a semana anterior (dias -7 a -1) mais a grade atual. */
  function history() {
    const map = toMap(previousPlan, -7);
    for (const [key, value] of Object.entries(plan)) if (value) map.set(key, value);
    return map;
  }

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

  /** Virou a semana com uma janela aberta: gravar escreveria na semana velha. */
  function weekTurnedOver() {
    if (isCurrentWeek && currentWeekStartISO() !== weekStart) {
      router.refresh();
      return true;
    }
    return false;
  }

  async function handleSelect(selected: SlotPlan | null) {
    if (!active) return;
    if (weekTurnedOver()) {
      setActive(null);
      return;
    }

    const key = planKey(active.dayOfWeek, active.mealType);
    const previous = plan;
    setPlan((prev) => ({ ...prev, [key]: selected }));
    const slot = active;
    setActive(null);
    setError(null);

    try {
      await api.put("/api/meal-plans", {
        weekStart,
        dayOfWeek: slot.dayOfWeek,
        mealType: slot.mealType,
        recipeId: selected?.recipeId ?? null,
        optionIngredientId: selected?.optionIngredientId ?? null,
      });
      // A lista de compras logo abaixo é calculada no servidor a partir do
      // plano: sem isto ela só acompanhava a grade depois de recarregar.
      router.refresh();
    } catch (e) {
      setPlan(previous);
      setError(errorMessage(e));
    }
  }

  async function handleFillSave(plans: { slot: Slot; plan: SlotPlan }[]) {
    if (weekTurnedOver()) {
      setFilling(false);
      return;
    }
    try {
      await api.put("/api/meal-plans/lote", {
        plans: plans.map(({ slot, plan: p }) => ({
          weekStart,
          dayOfWeek: slot.day,
          mealType: slot.mealType,
          recipeId: p.recipeId,
          optionIngredientId: p.optionIngredientId,
        })),
      });
    } catch (e) {
      throw new Error(errorMessage(e));
    }
    setPlan((prev) => {
      const next = { ...prev };
      for (const { slot, plan: p } of plans) next[slotKey(slot)] = p;
      return next;
    });
    setFilling(false);
    router.refresh();
    notify(`${plans.length} ${plans.length > 1 ? "refeições" : "refeição"} no cardápio.`);
  }

  const weekStartDate = new Date(weekStart);
  const todayIndex = todayIndexInWeek(weekStart);
  // Na semana de hoje, os dias que já passaram não entram no "preencher";
  // uma semana inteira no passado não tem o que preencher.
  const firstFillDay =
    todayIndex >= 0 ? todayIndex : weekStart < currentWeekStartISO() ? 7 : 0;
  const emptySlots: Slot[] = [];
  for (let day = firstFillDay; day < 7; day++) {
    for (const mealType of FILL_MEALS) {
      if (!plan[planKey(day, mealType)]) emptySlots.push({ day, mealType });
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => setFilling(true)}
          disabled={emptySlots.length === 0 || recipes.length === 0}
          title={
            recipes.length === 0
              ? "Cadastre pratos para poder sortear"
              : emptySlots.length === 0
                ? "Almoço e janta já estão preenchidos"
                : "Sorteia almoço e janta dos horários vazios"
          }
        >
          <Dices size={16} aria-hidden /> Preencher a semana
        </Button>
      </div>

      {/* No celular cada dia vira uma linha com as 3 refeições lado a lado;
          a grade de 7 colunas (720px) só a partir do tablet. */}
      <div className="md:overflow-x-auto">
        <ErrorNote message={error} />
        <div className="grid grid-cols-1 gap-4 md:min-w-[720px] md:grid-cols-7 md:gap-2">
          {WEEKDAY_LABELS.map((label, dayOfWeek) => {
            const isToday = dayOfWeek === todayIndex;
            return (
              <div key={label} className="flex flex-col gap-2">
                {/* O dia do mês embaixo do rótulo é o que deixa claro qual
                    semana está na tela — "Seg" sozinho servia para qualquer uma. */}
                <p
                  className={cn(
                    "text-sm font-semibold md:text-center",
                    isToday ? "text-accent-ink" : "text-text-primary",
                  )}
                >
                  {label}{" "}
                  <span className="font-normal">
                    {addUtcDays(weekStartDate, dayOfWeek).getUTCDate()}
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-2 md:flex md:flex-col">
                  {SLOT_MEALS.map((mealType) => {
                    const entry = plan[planKey(dayOfWeek, mealType)];
                    const recipe = entry ? byId.get(entry.recipeId) : undefined;
                    const option = recipe?.items.find(
                      (i) => i.ingredientId === entry?.optionIngredientId,
                    );
                    // O ponto diz se dá pra fazer com a opção escolhida (ou com
                    // qualquer uma, se nenhuma foi escolhida).
                    const status = recipe
                      ? recipeStatus(
                          recipe.items.filter(
                            (i) => i.role !== "OPCAO" || !option || i === option,
                          ),
                        )
                      : null;
                    const title = mealTitle(recipe?.title, option?.name);
                    return (
                      <button
                        key={mealType}
                        type="button"
                        onClick={() => setActive({ dayOfWeek, mealType })}
                        className={cn(
                          "flex flex-col gap-0.5 rounded-lg border bg-surface p-2 text-left hover:bg-hover",
                          isToday ? "border-accent/40" : "border-border",
                        )}
                      >
                        <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                          {mealTypeLabels[mealType]}
                        </span>
                        <span className="flex items-start gap-1.5 text-xs text-text-primary">
                          {status && status.state !== "sem-itens" && (
                            <span
                              role="img"
                              aria-label={status.state === "pronto" ? "dá pra fazer" : "falta algo"}
                              className={cn(
                                "mt-1 inline-block size-2 shrink-0 rounded-full",
                                status.state === "pronto" ? "bg-success" : "bg-warning",
                              )}
                            />
                          )}
                          <span className="min-w-0">{title || "—"}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {active && (
        <RecipePickerModal
          recipes={recipes}
          slot={{ day: active.dayOfWeek, mealType: active.mealType }}
          history={history()}
          current={plan[planKey(active.dayOfWeek, active.mealType)] ?? null}
          onSelect={handleSelect}
          onClose={() => setActive(null)}
        />
      )}

      {filling && (
        <SorteioSemanaModal
          recipes={recipes}
          emptySlots={emptySlots}
          history={history()}
          onSave={handleFillSave}
          onClose={() => setFilling(false)}
        />
      )}
    </>
  );
}
