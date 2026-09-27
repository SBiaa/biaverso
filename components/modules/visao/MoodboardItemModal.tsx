"use client";

import { useState } from "react";

import { Button, ErrorNote, Modal } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);

    try {
      if (mode === "create") {
        await api.post(`/api/vision/pillars/${pillarId}/moodboard`, form);
      } else if (initial) {
        await api.patch(`/api/vision/moodboard/${initial.id}`, form);
      }
      onSaved();
      onClose();
    } catch (e) {
      // O modal fica aberto com o que foi digitado, para não perder o texto.
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Adicionar ao moodboard" : "Editar item"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >

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

      <ErrorNote message={error} />

      <div className="mt-2 flex gap-2">
        <Button type="submit" disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
