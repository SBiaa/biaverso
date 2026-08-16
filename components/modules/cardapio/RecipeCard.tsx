"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  Card,
  confirmAction,
  ErrorNote,
  IconButton,
  notify,
} from "@/components/ui";
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
    const confirmed = await confirmAction({
      title: message,
      destructive: true,
    });
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/recipes/${recipe.id}`);
      router.refresh();
      notify("Excluído.");
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
          <IconButton
            title="Editar"
            onClick={() => setEditing(true)}
          >
            <Pencil size={15} />
          </IconButton>
          <IconButton
            title="Deletar"
            onClick={handleDelete}
            disabled={deleting}
            tone="danger"
          >
            <Trash2 size={15} />
          </IconButton>
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
