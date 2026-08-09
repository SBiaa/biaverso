"use client";

import { X } from "lucide-react";
import { recipeCategoryLabels } from "@/lib/labels";

type Recipe = { id: string; title: string; category: string };

type RecipePickerModalProps = {
  recipes: Recipe[];
  onSelect: (recipeId: string | null) => void;
  onClose: () => void;
};

export function RecipePickerModal({
  recipes,
  onSelect,
  onClose,
}: RecipePickerModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            Escolher receita
          </h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSelect(null)}
          className="rounded-md border border-border px-3 py-2 text-left text-sm text-text-secondary hover:bg-black/[0.03]"
        >
          Remover receita deste horário
        </button>

        <div className="flex flex-col gap-1 overflow-y-auto">
          {recipes.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhuma receita cadastrada ainda.
            </p>
          ) : (
            recipes.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => onSelect(recipe.id)}
                className="flex items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-black/[0.03]"
              >
                <span className="text-text-primary">{recipe.title}</span>
                <span className="text-xs text-text-secondary">
                  {recipeCategoryLabels[recipe.category]}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
