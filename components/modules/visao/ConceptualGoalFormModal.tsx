"use client";

import { useState } from "react";

import { Button, ErrorNote, Modal } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

type ConceptualGoalFormModalProps = {
  pillarId: string;
  mode: "create" | "edit";
  initial?: { id: string; title: string; description: string | null };
  onClose: () => void;
  onSaved: () => void;
};

export function ConceptualGoalFormModal({
  pillarId,
  mode,
  initial,
  onClose,
  onSaved,
}: ConceptualGoalFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
  });

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (mode === "create") {
        await api.post("/api/vision/goals/conceptual", { ...form, pillarId });
      } else if (initial) {
        await api.patch(`/api/vision/goals/conceptual/${initial.id}`, form);
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
      title={mode === "create" ? "Novo objetivo conceitual" : "Editar objetivo conceitual"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >

      <input
        placeholder="O que você quer ser/ter/sentir"
        value={form.title}
        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <textarea
        placeholder="Descrição (opcional)"
        value={form.description}
        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        className="min-h-[80px] resize-none rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
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
