"use client";

import { mealTypeLabels, recipeCategoryLabels } from "@/lib/labels";
import { Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

export type PickerRecipe = {
  id: string;
  title: string;
  categories: string[];
  /** Ingredientes que faltam em casa; -1 quando a receita não tem itens. */
  missing: number;
};

type RecipePickerModalProps = {
  recipes: PickerRecipe[];
  /** A refeição do horário clicado: as receitas marcadas para ela vêm primeiro. */
  mealType: string;
  onSelect: (recipeId: string | null) => void;
  onClose: () => void;
};

function MissingHint({ missing }: { missing: number }) {
  if (missing < 0) return null;
  return (
    <span
      className={cn(
        "shrink-0 text-[11px]",
        missing === 0 ? "text-success-soft-text" : "text-warning-soft-text",
      )}
    >
      {missing === 0 ? "tem tudo" : `falta${missing > 1 ? "m" : ""} ${missing}`}
    </span>
  );
}

export function RecipePickerModal({
  recipes,
  mealType,
  onSelect,
  onClose,
}: RecipePickerModalProps) {
  // Sugerir, não restringir: uma janta improvisada com receita de almoço
  // continua valendo, só aparece depois das que foram marcadas para janta.
  const suggested = recipes.filter((r) => r.categories.includes(mealType));
  const others = recipes.filter((r) => !r.categories.includes(mealType));

  function renderRecipe(recipe: PickerRecipe) {
    return (
      <button
        key={recipe.id}
        type="button"
        onClick={() => onSelect(recipe.id)}
        className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-hover"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-text-primary">{recipe.title}</span>
          <span className="block text-[11px] text-text-secondary">
            {recipe.categories.map((c) => recipeCategoryLabels[c] ?? c).join(" · ")}
          </span>
        </span>
        <MissingHint missing={recipe.missing} />
      </button>
    );
  }

  return (
    <Modal title={`Escolher receita · ${mealTypeLabels[mealType] ?? mealType}`} onClose={onClose}>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="rounded-md border border-border px-3 py-2 text-left text-sm text-text-secondary hover:bg-hover"
      >
        Remover receita deste horário
      </button>

      <div className="flex flex-col gap-1 overflow-y-auto">
        {recipes.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhuma receita cadastrada ainda.</p>
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
                  {suggested.length > 0 ? "Outras" : "Todas"}
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
