"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Card, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { AddRecipeForm } from "./AddRecipeForm";
import { recipeCategoryLabels } from "@/lib/labels";

type Recipe = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  ingredients: string;
  steps: string;
  prepTime: number | null;
  mealPlansCount: number;
};

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const message =
      recipe.mealPlansCount > 0
        ? `Esta receita está planejada em ${recipe.mealPlansCount} dia(s) do cardápio. Ao deletar, esses slots ficarão vazios. Tem certeza que quer deletar esta receita? Esta ação não pode ser desfeita.`
        : "Tem certeza que quer deletar esta receita? Esta ação não pode ser desfeita.";
    if (!confirm(message)) return;

    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/recipes/${recipe.id}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      // Sem isso o botão ficava desabilitado para sempre depois de uma falha.
      setDeleting(false);
    }
  }

  if (editing) {
    return <AddRecipeForm recipe={recipe} onClose={() => setEditing(false)} />;
  }

  return (
    <Card className="flex flex-col gap-2">
      <ErrorNote message={error} />
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">
          {recipe.title}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {recipeCategoryLabels[recipe.category]}
          </span>
          <button
            type="button"
            title="Editar"
            onClick={() => setEditing(true)}
            className="text-text-secondary hover:text-text-primary"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            title="Deletar"
            onClick={handleDelete}
            disabled={deleting}
            className="text-text-secondary hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {recipe.description && (
        <p className="text-xs text-text-secondary">{recipe.description}</p>
      )}
      {recipe.prepTime && (
        <p className="text-xs text-text-secondary">
          {recipe.prepTime} min de preparo
        </p>
      )}
      <div>
        <p className="text-xs font-medium text-text-primary">Ingredientes</p>
        <p className="text-xs text-text-secondary">{recipe.ingredients}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-text-primary">
          Modo de preparo
        </p>
        <p className="text-xs text-text-secondary">{recipe.steps}</p>
      </div>
    </Card>
  );
}
