"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";

type PrincipleFormModalProps = {
  pillarId: string;
  mode: "create" | "edit";
  initial?: { id: string; title: string; body: string | null };
  onClose: () => void;
  onSaved: () => void;
};

export function PrincipleFormModal({
  pillarId,
  mode,
  initial,
  onClose,
  onSaved,
}: PrincipleFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    body: initial?.body ?? "",
  });

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    if (mode === "create") {
      await fetch("/api/vision/principles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, pillarId }),
      });
    } else if (initial) {
      await fetch(`/api/vision/principles/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            {mode === "create" ? "Novo princípio" : "Editar princípio"}
          </h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <input
          placeholder="Título"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <textarea
          placeholder="Reflexão livre"
          value={form.body}
          onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
          className="min-h-[100px] resize-none rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />

        <div className="mt-2 flex gap-2">
          <Button onClick={handleSubmit} disabled={saving}>
            Salvar
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
