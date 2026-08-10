"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { measuredGoalStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(measuredGoalStatusLabels);

type MeasuredGoalFormModalProps = {
  conceptualGoalId: string;
  mode: "create" | "edit";
  initial?: {
    id: string;
    title: string;
    target: string | null;
    deadline: string | null;
    status: string;
    progress: number;
  };
  onClose: () => void;
  onSaved: () => void;
};

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function MeasuredGoalFormModal({
  conceptualGoalId,
  mode,
  initial,
  onClose,
  onSaved,
}: MeasuredGoalFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    target: initial?.target ?? "",
    deadline: toDateInputValue(initial?.deadline ?? null),
    status: initial?.status ?? "EM_ANDAMENTO",
    progress: initial?.progress ?? 0,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      deadline: form.deadline || null,
      progress: Number(form.progress),
    };

    try {
      if (mode === "create") {
        await api.post("/api/vision/goals/measured", { ...payload, conceptualGoalId });
      } else if (initial) {
        await api.patch(`/api/vision/goals/measured/${initial.id}`, payload);
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
            {mode === "create" ? "Novo objetivo metrificado" : "Editar objetivo metrificado"}
          </h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <input
          placeholder="Título"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          placeholder="Meta (ex: R$10k/mês, 5x por semana)"
          value={form.target}
          onChange={(e) => update("target", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <p className="mb-1 text-xs text-text-secondary">Prazo</p>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => update("deadline", e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex-1">
            <p className="mb-1 text-xs text-text-secondary">Status</p>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {measuredGoalStatusLabels[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
            <span>Progresso</span>
            <span>{form.progress}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={form.progress}
            onChange={(e) => update("progress", Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        <ErrorNote message={error} />

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
