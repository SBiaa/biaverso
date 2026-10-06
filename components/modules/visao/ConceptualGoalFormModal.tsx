"use client";

import { useState } from "react";

import { Button, ErrorNote, Modal } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { measuredGoalStatusLabels } from "@/lib/labels";
import { usePriorityLevels } from "@/components/modules/tarefas/usePriorityLevels";

const statusOptions = Object.keys(measuredGoalStatusLabels);

type ConceptualGoalFormModalProps = {
  pillarId: string;
  mode: "create" | "edit";
  initial?: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priorityLevelId: string | null;
    category: string | null;
    challenge: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
};

const field =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

export function ConceptualGoalFormModal({
  pillarId,
  mode,
  initial,
  onClose,
  onSaved,
}: ConceptualGoalFormModalProps) {
  const levels = usePriorityLevels();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "EM_ANDAMENTO",
    priorityLevelId: initial?.priorityLevelId ?? "",
    category: initial?.category ?? "",
    challenge: initial?.challenge ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    const payload = { ...form, priorityLevelId: form.priorityLevelId || null };

    try {
      if (mode === "create") {
        await api.post("/api/vision/goals/conceptual", { ...payload, pillarId });
      } else if (initial) {
        await api.patch(`/api/vision/goals/conceptual/${initial.id}`, payload);
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
        onChange={(e) => update("title", e.target.value)}
        className={field}
      />
      <textarea
        placeholder="Descrição (opcional)"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        className={`min-h-[80px] resize-none ${field}`}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-text-secondary">Status</p>
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            className={`w-full ${field}`}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {measuredGoalStatusLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs text-text-secondary">Prioridade</p>
          <select
            value={form.priorityLevelId}
            onChange={(e) => update("priorityLevelId", e.target.value)}
            className={`w-full ${field}`}
          >
            <option value="">Sem prioridade</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <input
        placeholder="Categoria (ex.: Negócios, Estudo, Saúde)"
        value={form.category}
        onChange={(e) => update("category", e.target.value)}
        className={field}
      />
      <input
        placeholder="Desafio — o que atrapalha (ex.: ter constância)"
        value={form.challenge}
        onChange={(e) => update("challenge", e.target.value)}
        className={field}
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
