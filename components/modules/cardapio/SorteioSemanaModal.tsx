"use client";

import { useState } from "react";
import { Dices, X } from "lucide-react";
import { Button, ErrorNote, Modal, ModalActions } from "@/components/ui";
import { WEEKDAY_LABELS } from "@/lib/cardapio";
import { mealTypeLabels } from "@/lib/labels";
import { mealTitle, type RecipeView } from "@/lib/pratos";
import {
  drawMany,
  drawMeal,
  slotKey,
  type DrawResult,
  type Slot,
  type SlotPlan,
} from "@/lib/sorteio";
import { OnlyAtHomeToggle } from "./RecipePickerModal";

type Row = { slot: Slot; result: DrawResult | null };

/**
 * "Preencher a semana": sorteia todos os horários vazios de uma vez, em
 * ordem, sem repetir proteína em refeições seguidas. Nada é gravado até
 * "Salvar"; cada linha pode ser trocada ou deixada vazia.
 */
export function SorteioSemanaModal({
  recipes,
  emptySlots,
  history,
  onSave,
  onClose,
}: {
  recipes: RecipeView[];
  emptySlots: Slot[];
  history: Map<string, SlotPlan>;
  onSave: (plans: { slot: Slot; plan: SlotPlan }[]) => Promise<void>;
  onClose: () => void;
}) {
  const [onlyAtHome, setOnlyAtHome] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => drawAll(false));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function drawAll(atHome: boolean): Row[] {
    const results = drawMany(recipes, emptySlots, history, { onlyAtHome: atHome });
    return emptySlots.map((slot) => ({ slot, result: results.get(slotKey(slot)) ?? null }));
  }

  /** O histórico com o que já foi sorteado nas outras linhas (menos `skip`). */
  function historyWithRows(current: Row[], skip: string) {
    const map = new Map(history);
    for (const row of current) {
      if (slotKey(row.slot) === skip || !row.result?.pick) continue;
      map.set(slotKey(row.slot), {
        recipeId: row.result.pick.recipeId,
        optionIngredientId: row.result.pick.optionIngredientId,
      });
    }
    return map;
  }

  function redraw(index: number) {
    setRows((current) => {
      const row = current[index];
      const key = slotKey(row.slot);
      const result = drawMeal(recipes, row.slot, historyWithRows(current, key), {
        onlyAtHome,
        exclude: row.result?.pick ? [row.result.pick.recipeId] : [],
      });
      return current.map((r, i) => (i === index ? { ...r, result } : r));
    });
  }

  function clear(index: number) {
    setRows((current) => current.map((r, i) => (i === index ? { ...r, result: null } : r)));
  }

  async function handleSave() {
    const plans = rows
      .filter((row) => row.result?.pick)
      .map((row) => ({
        slot: row.slot,
        plan: {
          recipeId: row.result!.pick!.recipeId,
          optionIngredientId: row.result!.pick!.optionIngredientId,
        },
      }));
    if (plans.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(plans);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu para salvar.");
      setSaving(false);
    }
  }

  const byId = new Map(recipes.map((r) => [r.id, r]));
  const filled = rows.filter((r) => r.result?.pick).length;

  return (
    <Modal title="Preencher a semana" onClose={onClose} size="md">
      <ErrorNote message={error} />
      {emptySlots.length === 0 ? (
        <p className="text-sm text-text-secondary">A semana já está toda preenchida.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <OnlyAtHomeToggle
              value={onlyAtHome}
              onChange={(value) => {
                setOnlyAtHome(value);
                setRows(drawAll(value));
              }}
            />
            <Button variant="secondary" onClick={() => setRows(drawAll(onlyAtHome))}>
              <Dices size={16} aria-hidden /> Sortear tudo de novo
            </Button>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((row, index) => {
              const pick = row.result?.pick;
              const recipe = pick ? byId.get(pick.recipeId) : null;
              const option = recipe?.items.find((i) => i.ingredientId === pick?.optionIngredientId);
              return (
                <li key={slotKey(row.slot)} className="flex items-start gap-2 py-2">
                  <span className="w-24 shrink-0 pt-0.5 text-xs text-text-secondary">
                    {WEEKDAY_LABELS[row.slot.day]} · {mealTypeLabels[row.slot.mealType]}
                  </span>
                  <span className="min-w-0 flex-1">
                    {recipe ? (
                      <>
                        <span className="block text-sm text-text-primary">
                          {mealTitle(recipe.title, option?.name)}
                        </span>
                        {pick!.reasons[0] && (
                          <span className="block text-xs text-text-secondary">
                            {pick!.reasons[0]}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="block text-sm text-text-secondary">
                        {row.result && row.result.pick === null ? row.result.reason : "Fica vazio"}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => redraw(index)}
                    aria-label={`Sortear outro para ${WEEKDAY_LABELS[row.slot.day]}, ${mealTypeLabels[row.slot.mealType]}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-hover hover:text-text-primary"
                  >
                    <Dices size={16} />
                  </button>
                  {pick && (
                    <button
                      type="button"
                      onClick={() => clear(index)}
                      aria-label={`Deixar vazio ${WEEKDAY_LABELS[row.slot.day]}, ${mealTypeLabels[row.slot.mealType]}`}
                      className="flex size-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-hover hover:text-text-primary"
                    >
                      <X size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <ModalActions>
        <Button onClick={handleSave} disabled={saving || filled === 0}>
          Salvar {filled > 0 ? `${filled} refeiç${filled > 1 ? "ões" : "ão"}` : ""}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </ModalActions>
    </Modal>
  );
}
