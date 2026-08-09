"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { moodboardTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

const typeOptions = Object.keys(moodboardTypeLabels);

type MoodboardItemModalProps = {
  pillarId: string;
  mode: "create" | "edit";
  initial?: { id: string; type: string; content: string; caption: string | null };
  onClose: () => void;
  onSaved: () => void;
};

export function MoodboardItemModal({
  pillarId,
  mode,
  initial,
  onClose,
  onSaved,
}: MoodboardItemModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: initial?.type ?? "PALAVRA",
    content: initial?.content ?? "",
    caption: initial?.caption ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.content.trim()) return;
    setSaving(true);
    if (mode === "create") {
      await fetch(`/api/vision/pillars/${pillarId}/moodboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else if (initial) {
      await fetch(`/api/vision/moodboard/${initial.id}`, {
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
            {mode === "create" ? "Adicionar ao moodboard" : "Editar item"}
          </h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <div className="flex gap-2">
          {typeOptions.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => update("type", type)}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium",
                form.type === type
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-secondary",
              )}
            >
              {moodboardTypeLabels[type]}
            </button>
          ))}
        </div>

        {form.type === "IMAGEM" ? (
          <input
            placeholder="URL da imagem"
            value={form.content}
            onChange={(e) => update("content", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        ) : form.type === "FRASE" ? (
          <textarea
            placeholder="Frase"
            value={form.content}
            onChange={(e) => update("content", e.target.value)}
            className="min-h-[80px] resize-none rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        ) : (
          <input
            placeholder="Palavra"
            value={form.content}
            onChange={(e) => update("content", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        )}

        <input
          placeholder="Legenda (opcional)"
          value={form.caption}
          onChange={(e) => update("caption", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
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
