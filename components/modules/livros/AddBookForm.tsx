"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { bookStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(bookStatusLabels);

export function AddBookForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    author: "",
    status: "QUERO_LER",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    setForm({ title: "", author: "", status: "QUERO_LER" });
    router.refresh();
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Novo livro</Button>;
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
        <input
          placeholder="Autor (opcional)"
          value={form.author}
          onChange={(e) => update("author", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <select
          value={form.status}
          onChange={(e) => update("status", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {bookStatusLabels[s]}
            </option>
          ))}
        </select>
      </div>
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
