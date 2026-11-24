"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  confirmAction,
  ErrorNote,
  Modal,
  ModalActions,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { recipeCategoryLabels } from "@/lib/labels";
import { statusLong, statusShort, type RecipeItemView, type RecipeView } from "@/lib/pratos";
import { cn } from "@/lib/utils";
import { RecipeFormModal, StatusDot, type DotStatus, type PantryOption } from "./RecipeForm";

export function itemDot(item: RecipeItemView): DotStatus {
  if (item.alwaysHave) return "always";
  return item.inStock ? "in" : "out";
}

export function StatusPill({ recipe, long = false }: { recipe: RecipeView; long?: boolean }) {
  const text = long ? statusLong(recipe.status) : statusShort(recipe.status);
  if (recipe.status.state === "sem-itens") return null;
  const ready = recipe.status.state === "pronto";
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
        ready
          ? "bg-success-soft-bg text-success-soft-text"
          : "bg-warning-soft-bg text-warning-soft-text",
      )}
    >
      {text}
    </span>
  );
}

const sections = [
  { role: "PRECISA", title: "Precisa" },
  { role: "OPCAO", title: "Escolha um" },
  { role: "OPCIONAL", title: "Se tiver" },
] as const;

/** A janela do prato: tudo que o card resume, e editar/excluir. */
export function RecipeModal({
  recipe,
  pantry,
  onClose,
}: {
  recipe: RecipeView;
  pantry: PantryOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const message =
      recipe.mealPlansCount > 0
        ? `Este prato está no cardápio em ${recipe.mealPlansCount} horário(s); eles ficam vazios. Excluir mesmo? Não dá pra desfazer.`
        : "Excluir este prato? Não dá pra desfazer.";
    if (!(await confirmAction({ title: message, destructive: true }))) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/recipes/${recipe.id}`);
      onClose();
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      setError(errorMessage(e));
      setDeleting(false);
    }
  }

  if (editing) {
    return (
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
            role: item.role,
          })),
        }}
        pantry={pantry}
        onClose={onClose}
      />
    );
  }

  return (
    <Modal title={recipe.title} onClose={onClose} size="md">
      <ErrorNote message={error} />
      <div className="flex flex-wrap items-center gap-1.5">
        {recipe.categories.map((category) => (
          <Badge key={category}>{recipeCategoryLabels[category] ?? category}</Badge>
        ))}
        {recipe.prepTime && (
          <span className="text-xs text-text-secondary">{recipe.prepTime} min</span>
        )}
      </div>

      {recipe.status.state !== "sem-itens" && <StatusPill recipe={recipe} long />}

      {recipe.description && (
        <p className="text-sm text-text-secondary">{recipe.description}</p>
      )}

      {sections.map(({ role, title }) => {
        const items = recipe.items.filter((item) => item.role === role);
        if (items.length === 0) return null;
        return (
          <div key={role} className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              {title}
            </p>
            <ul className="flex flex-col gap-1">
              {items.map((item) => (
                <li key={item.ingredientId} className="flex items-center gap-2 text-sm">
                  <StatusDot status={itemDot(item)} />
                  <span className="text-text-primary">{item.name}</span>
                  {item.quantity && (
                    <span className="text-text-secondary">· {item.quantity}</span>
                  )}
                  {item.alwaysHave && (
                    <span className="text-xs text-text-secondary">sempre tem</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {recipe.ingredientsText && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Ingredientes (texto antigo)
          </p>
          <p className="whitespace-pre-line text-sm text-text-secondary">
            {recipe.ingredientsText}
          </p>
        </div>
      )}

      {recipe.steps && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Modo de preparo
          </p>
          <p className="whitespace-pre-line text-sm text-text-primary">{recipe.steps}</p>
        </div>
      )}

      <ModalActions>
        <Button onClick={() => setEditing(true)}>Editar</Button>
        <Button variant="ghost" onClick={handleDelete} disabled={deleting}>
          Excluir
        </Button>
      </ModalActions>
    </Modal>
  );
}
