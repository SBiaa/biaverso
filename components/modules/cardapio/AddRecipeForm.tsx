"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { recipeCategoryLabels } from "@/lib/labels";

const categoryOptions = Object.keys(recipeCategoryLabels);

type RecipeInitial = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  ingredients: string;
  steps: string;
  prepTime: number | null;
};

function emptyForm() {
  return {
    title: "",
    category: categoryOptions[0],
    prepTime: "",
    description: "",
    ingredients: "",
    steps: "",
  };
}

function formFromRecipe(recipe: RecipeInitial) {
  return {
    title: recipe.title,
    category: recipe.category,
    prepTime: recipe.prepTime ? String(recipe.prepTime) : "",
    description: recipe.description ?? "",
    ingredients: recipe.ingredients,
    steps: recipe.steps,
  };
}

export function AddRecipeForm({
  recipe,
  onClose,
}: {
  recipe?: RecipeInitial;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!recipe;
  const [open, setOpen] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(recipe ? formFromRecipe(recipe) : emptyForm());

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openForm() {
    setForm(recipe ? formFromRecipe(recipe) : emptyForm());
    setOpen(true);
  }

  function cancel() {
    setOpen(false);
    onClose?.();
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.ingredients.trim() || !form.steps.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (isEdit) await api.patch(`/api/recipes/${recipe!.id}`, form);
      else await api.post("/api/recipes", form);
      setOpen(false);
      if (!isEdit) setForm(emptyForm());
      onClose?.();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return <Button onClick={openForm}>+ Nova receita</Button>;
  }

  return (
    <Card className="flex flex-col gap-2">
      <ErrorNote message={error} />
      <input
        placeholder="Título"
        value={form.title}
        onChange={(e) => update("title", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex gap-2">
        <select
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {recipeCategoryLabels[c]}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Preparo (min)"
          value={form.prepTime}
          onChange={(e) => update("prepTime", e.target.value)}
          className="w-36 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <input
        placeholder="Descrição (opcional)"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <textarea
        placeholder="Ingredientes"
        value={form.ingredients}
        onChange={(e) => update("ingredients", e.target.value)}
        rows={3}
        className="resize-none rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <textarea
        placeholder="Modo de preparo"
        value={form.steps}
        onChange={(e) => update("steps", e.target.value)}
        rows={3}
        className="resize-none rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={cancel}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
