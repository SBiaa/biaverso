"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  Card,
  confirmAction,
  ErrorNote,
  IconButton,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { recipeCategoryLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { RecipeView } from "@/lib/receitas";
import { RecipeFormModal, StatusDot, type PantryOption } from "./RecipeForm";

export function RecipeCard({
  recipe,
  pantry,
}: {
  recipe: RecipeView;
  pantry: PantryOption[];
}) {
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

  const missingNames = recipe.items.filter((item) => !item.inStock).map((item) => item.name);

  return (
    <Card className="flex flex-col gap-2">
      <ErrorNote message={error} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-text-primary">{recipe.title}</p>
          <div className="flex flex-wrap gap-1">
            {recipe.categories.map((category) => (
              <Badge key={category}>{recipeCategoryLabels[category] ?? category}</Badge>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <IconButton title="Editar" onClick={() => setEditing(true)}>
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
        <p className="text-xs text-text-secondary">{recipe.prepTime} min de preparo</p>
      )}

      {recipe.items.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-text-primary">Ingredientes</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                recipe.missing === 0
                  ? "bg-success-soft-bg text-success-soft-text"
                  : "bg-warning-soft-bg text-warning-soft-text",
              )}
            >
              {recipe.missing === 0
                ? "Dá pra fazer"
                : `Falta${recipe.missing > 1 ? "m" : ""} ${recipe.missing}`}
            </span>
          </div>
          <ul className="flex flex-col gap-0.5">
            {recipe.items.map((item) => (
              <li
                key={item.ingredientId}
                className="flex items-center gap-2 text-xs"
              >
                <StatusDot status={item.inStock ? "in" : "out"} />
                <span
                  className={cn(item.inStock ? "text-text-secondary" : "text-text-primary")}
                >
                  {item.name}
                </span>
                {item.quantity && (
                  <span className="text-text-secondary">· {item.quantity}</span>
                )}
              </li>
            ))}
          </ul>
          {missingNames.length > 0 && (
            <p className="text-[11px] text-text-secondary">
              Comprar: {missingNames.join(", ")}
            </p>
          )}
        </div>
      )}

      {recipe.ingredientsText && (
        <div>
          <p className="text-xs font-medium text-text-primary">
            {recipe.items.length > 0 ? "Ingredientes (texto)" : "Ingredientes"}
          </p>
          <p className="whitespace-pre-line text-xs text-text-secondary">
            {recipe.ingredientsText}
          </p>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-text-primary">Modo de preparo</p>
        <p className="whitespace-pre-line text-xs text-text-secondary">{recipe.steps}</p>
      </div>

      {editing && (
        <RecipeFormModal
          recipe={{
            id: recipe.id,
            title: recipe.title,
            categories: recipe.categories,
            description: recipe.description,
            ingredientsText: recipe.ingredientsText,
            steps: recipe.steps,
            prepTime: recipe.prepTime,
            items: recipe.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
            })),
          }}
          pantry={pantry}
          onClose={() => setEditing(false)}
        />
      )}
    </Card>
  );
}
