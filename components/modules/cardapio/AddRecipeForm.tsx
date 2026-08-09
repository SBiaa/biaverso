"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { recipeCategoryLabels } from "@/lib/labels";

const categoryOptions = Object.keys(recipeCategoryLabels);

export function AddRecipeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: categoryOptions[0],
    prepTime: "",
    description: "",
    ingredients: "",
    steps: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.ingredients.trim() || !form.steps.trim()) return;
    setSaving(true);
    await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    setForm({
      title: "",
      category: categoryOptions[0],
      prepTime: "",
      description: "",
      ingredients: "",
      steps: "",
    });
    router.refresh();
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Nova receita</Button>;
  }

  return (
    <Card className="flex flex-col gap-2">
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
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
