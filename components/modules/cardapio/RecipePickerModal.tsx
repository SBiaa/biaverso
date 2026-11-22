"use client";

import { useState } from "react";
import { Dices } from "lucide-react";
import { mealTypeLabels, recipeCategoryLabels } from "@/lib/labels";
import { Button, Modal } from "@/components/ui";
import { hasAtHome, mealTitle, statusShort, type RecipeView } from "@/lib/pratos";
import { drawMeal, recipeOptions, type DrawResult, type Slot, type SlotPlan } from "@/lib/sorteio";
import { cn } from "@/lib/utils";

type RecipePickerModalProps = {
  recipes: RecipeView[];
  slot: Slot;
  /** Tudo que está planejado em volta, para o sorteio não repetir proteína. */
  history: Map<string, SlotPlan>;
  current: SlotPlan | null;
  onSelect: (plan: SlotPlan | null) => void;
  onClose: () => void;
};

export function OnlyAtHomeToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs text-text-secondary">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--color-accent)]"
      />
      Só com o que tenho em casa
    </label>
  );
}

function StatusHint({ recipe }: { recipe: RecipeView }) {
  const text = statusShort(recipe.status);
  if (!text) return null;
  return (
    <span
      className={cn(
        "max-w-[45%] shrink-0 truncate text-right text-xs",
        recipe.status.state === "pronto" ? "text-success-soft-text" : "text-warning-soft-text",
      )}
    >
      {recipe.status.state === "pronto" ? "dá pra fazer" : text.toLowerCase()}
    </span>
  );
}

export function RecipePickerModal({
  recipes,
  slot,
  history,
  current,
  onSelect,
  onClose,
}: RecipePickerModalProps) {
  const mealType = slot.mealType;
  const [onlyAtHome, setOnlyAtHome] = useState(false);
  const [draw, setDraw] = useState<DrawResult | null>(null);
  // Prato com "escolha um" escolhido na lista: falta dizer qual opção.
  const [choosingOption, setChoosingOption] = useState<RecipeView | null>(null);

  function sortear(exclude?: string) {
    setDraw(
      drawMeal(recipes, slot, history, {
        onlyAtHome,
        exclude: [exclude, current?.recipeId].filter((id): id is string => !!id),
      }),
    );
  }

  function pick(recipe: RecipeView) {
    const options = recipeOptions(recipe);
    if (options.length === 0) onSelect({ recipeId: recipe.id, optionIngredientId: null });
    else setChoosingOption(recipe);
  }

  // Sugerir, não restringir: uma janta improvisada com prato de almoço
  // continua valendo, só aparece depois dos que foram marcados para janta.
  const suggested = recipes.filter((r) => r.categories.includes(mealType));
  const others = recipes.filter((r) => !r.categories.includes(mealType));
  const drawn = draw?.pick ? recipes.find((r) => r.id === draw.pick!.recipeId) : null;
  const drawnOption = drawn?.items.find((i) => i.ingredientId === draw?.pick?.optionIngredientId);

  function renderRecipe(recipe: RecipeView) {
    return (
      <button
        key={recipe.id}
        type="button"
        onClick={() => pick(recipe)}
        className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-hover"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-text-primary">{recipe.title}</span>
          <span className="block text-xs text-text-secondary">
            {recipe.categories.map((c) => recipeCategoryLabels[c] ?? c).join(" · ")}
          </span>
        </span>
        <StatusHint recipe={recipe} />
      </button>
    );
  }

  if (choosingOption) {
    const options = recipeOptions(choosingOption);
    return (
      <Modal title={`${choosingOption.title} com…`} onClose={onClose}>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const home = hasAtHome(option);
            return (
              <button
                key={option.ingredientId}
                type="button"
                onClick={() =>
                  onSelect({ recipeId: choosingOption.id, optionIngredientId: option.ingredientId })
                }
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm font-medium hover:bg-hover",
                  home ? "border-success text-text-primary" : "border-border text-text-secondary",
                )}
              >
                {option.name}
                <span className="ml-1.5 text-xs font-normal text-text-secondary">
                  {home ? "tem" : "falta"}
                </span>
              </button>
            );
          })}
        </div>
        <ModalBack onClick={() => setChoosingOption(null)} />
      </Modal>
    );
  }

  return (
    <Modal title={`Escolher prato · ${mealTypeLabels[mealType] ?? mealType}`} onClose={onClose}>
      {/* Sortear vem antes da lista: é o caminho para quando não sabe o que quer. */}
      <div className="flex flex-col gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3">
        {draw === null ? (
          <Button onClick={() => sortear()} className="self-start">
            <Dices size={16} aria-hidden /> Sortear pra mim
          </Button>
        ) : draw.pick && drawn ? (
          <>
            <p className="text-sm font-semibold text-text-primary">
              {mealTitle(drawn.title, drawnOption?.name)}
            </p>
            <ul className="flex flex-col gap-0.5 text-xs text-text-secondary">
              {draw.pick.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                onClick={() =>
                  onSelect({
                    recipeId: draw.pick!.recipeId,
                    optionIngredientId: draw.pick!.optionIngredientId,
                  })
                }
              >
                Usar este
              </Button>
              <Button variant="secondary" onClick={() => sortear(draw.pick!.recipeId)}>
                <Dices size={16} aria-hidden /> Outro
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary">{draw.pick === null ? draw.reason : ""}</p>
            <Button variant="secondary" onClick={() => sortear()} className="self-start">
              Tentar de novo
            </Button>
          </>
        )}
        <OnlyAtHomeToggle value={onlyAtHome} onChange={setOnlyAtHome} />
      </div>

      {current && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="rounded-md border border-border px-3 py-2 text-left text-sm text-text-secondary hover:bg-hover"
        >
          Deixar este horário vazio
        </button>
      )}

      <div className="flex flex-col gap-1 overflow-y-auto">
        {recipes.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhum prato cadastrado ainda.</p>
        ) : (
          <>
            {suggested.length > 0 && (
              <>
                <p className="px-3 pt-1 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                  Para {mealTypeLabels[mealType]?.toLowerCase() ?? "esta refeição"}
                </p>
                {suggested.map(renderRecipe)}
              </>
            )}
            {others.length > 0 && (
              <>
                <p className="px-3 pt-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                  {suggested.length > 0 ? "Outros" : "Todos"}
                </p>
                {others.map(renderRecipe)}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function ModalBack({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick} className="self-start">
      Voltar
    </Button>
  );
}
