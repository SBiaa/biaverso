"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { bookStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(bookStatusLabels);

export function AddBookForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    author: "",
    status: "QUERO_LER",
    totalPages: "",
    currentPage: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      // Campos numéricos vazios viram null no schema; string vazia seria erro.
      await api.post("/api/books", {
        ...form,
        totalPages: form.totalPages || null,
        currentPage: form.currentPage || null,
      });
      setOpen(false);
      setForm({
        title: "",
        author: "",
        status: "QUERO_LER",
        totalPages: "",
        currentPage: "",
      });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Novo livro</Button>;
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
        <input
          type="number"
          placeholder="Total de páginas"
          value={form.totalPages}
          onChange={(e) => update("totalPages", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        {form.status === "LENDO" && (
          <input
            type="number"
            placeholder="Página atual"
            value={form.currentPage}
            onChange={(e) => update("currentPage", e.target.value)}
            className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        )}
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
