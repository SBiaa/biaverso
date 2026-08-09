"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { knowledgeAreaLabels, knowledgeTypeLabels } from "@/lib/labels";

const typeOptions = Object.keys(knowledgeTypeLabels);
const areaOptions = Object.keys(knowledgeAreaLabels);

export function AddKnowledgeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    source: "",
    type: typeOptions[0],
    area: areaOptions[0],
    summary: "",
    link: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    setForm({
      title: "",
      source: "",
      type: typeOptions[0],
      area: areaOptions[0],
      summary: "",
      link: "",
    });
    router.refresh();
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Novo conteúdo</Button>;
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
          value={form.type}
          onChange={(e) => update("type", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {knowledgeTypeLabels[t]}
            </option>
          ))}
        </select>
        <select
          value={form.area}
          onChange={(e) => update("area", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {areaOptions.map((a) => (
            <option key={a} value={a}>
              {knowledgeAreaLabels[a]}
            </option>
          ))}
        </select>
      </div>
      <input
        placeholder="Fonte/link (opcional)"
        value={form.source}
        onChange={(e) => update("source", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <textarea
        placeholder="Resumo do que aprendeu (opcional)"
        value={form.summary}
        onChange={(e) => update("summary", e.target.value)}
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
