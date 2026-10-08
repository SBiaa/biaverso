"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

const field =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

export function AddCourseForm({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", instructor: "", platform: "", link: "" });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/study/courses", { subjectId, ...form });
      setForm({ title: "", instructor: "", platform: "", link: "" });
      setOpen(false);
      router.refresh();
      notify("Curso adicionado.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-my-2 w-fit py-2 text-xs font-medium text-accent"
      >
        + Adicionar curso
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
      <ErrorNote message={error} />
      <input
        autoFocus
        placeholder="Nome do curso"
        value={form.title}
        onChange={(e) => update("title", e.target.value)}
        className={field}
      />
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Quem ensina"
          value={form.instructor}
          onChange={(e) => update("instructor", e.target.value)}
          className={`${field} min-w-0 flex-1`}
        />
        <input
          placeholder="Plataforma (Udemy, YouTube...)"
          value={form.platform}
          onChange={(e) => update("platform", e.target.value)}
          className={`${field} min-w-0 flex-1`}
        />
      </div>
      <input
        placeholder="Link (opcional)"
        value={form.link}
        onChange={(e) => update("link", e.target.value)}
        className={field}
      />
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
