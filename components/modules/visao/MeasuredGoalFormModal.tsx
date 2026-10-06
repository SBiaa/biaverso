"use client";

import { useState } from "react";

import { Button, ErrorNote, Modal } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { goalTermLabels, measuredGoalStatusLabels } from "@/lib/labels";
import { parseGoalAmount } from "@/lib/vision-shared";

const statusOptions = Object.keys(measuredGoalStatusLabels);
const termOptions = Object.keys(goalTermLabels);

export type BusinessOption = { id: string; name: string };

export type MeasuredGoalInitial = {
  id: string;
  title: string;
  target: string | null;
  deadline: string | null;
  status: string;
  progress: number;
  term: string | null;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  businessId: string | null;
};

type MeasuredGoalFormModalProps = {
  conceptualGoalId: string;
  mode: "create" | "edit";
  initial?: MeasuredGoalInitial;
  businesses: BusinessOption[];
  onClose: () => void;
  onSaved: () => void;
};

const field =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function amountText(value: number | null) {
  return value === null ? "" : String(value).replace(".", ",");
}

export function MeasuredGoalFormModal({
  conceptualGoalId,
  mode,
  initial,
  businesses,
  onClose,
  onSaved,
}: MeasuredGoalFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    deadline: toDateInputValue(initial?.deadline ?? null),
    status: initial?.status ?? "EM_ANDAMENTO",
    term: initial?.term ?? "",
    targetValue: amountText(initial?.targetValue ?? null),
    currentValue: amountText(initial?.currentValue ?? 0),
    unit: initial?.unit ?? "",
    businessId: initial?.businessId ?? "",
    progress: initial?.progress ?? 0,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Sem meta numérica o percentual volta a ser manual — é o que o slider cobre.
  const hasNumericTarget = parseGoalAmount(form.targetValue) != null;

  async function handleSubmit() {
    if (!form.title.trim()) return;

    const targetValue = parseGoalAmount(form.targetValue);
    const currentValue = parseGoalAmount(form.currentValue);
    if (targetValue === undefined || currentValue === undefined) {
      setError("Valor inválido. Use algo como 1800, 1.800 ou 7k.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title: form.title,
      deadline: form.deadline || null,
      status: form.status,
      term: form.term || null,
      targetValue,
      currentValue: currentValue ?? 0,
      unit: form.unit,
      businessId: form.businessId || null,
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
    <Modal
      title={mode === "create" ? "Novo objetivo metrificado" : "Editar objetivo metrificado"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <input
        placeholder="Título"
        value={form.title}
        onChange={(e) => update("title", e.target.value)}
        className={field}
      />

      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="mb-1 text-xs text-text-secondary">Meta</p>
          <input
            placeholder="Ex.: 3000"
            value={form.targetValue}
            onChange={(e) => update("targetValue", e.target.value)}
            className={`w-full ${field}`}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-text-secondary">Completado</p>
          <input
            placeholder="Ex.: 1800"
            value={form.currentValue}
            onChange={(e) => update("currentValue", e.target.value)}
            className={`w-full ${field}`}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-text-secondary">Unidade</p>
          <input
            placeholder="R$, seguidores"
            value={form.unit}
            onChange={(e) => update("unit", e.target.value)}
            className={`w-full ${field}`}
          />
        </div>
      </div>

      {!hasNumericTarget && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
            <span>Sem meta numérica: progresso manual</span>
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
      )}

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
          <p className="mb-1 text-xs text-text-secondary">Termo</p>
          <select
            value={form.term}
            onChange={(e) => update("term", e.target.value)}
            className={`w-full ${field}`}
          >
            <option value="">Sem termo</option>
            {termOptions.map((t) => (
              <option key={t} value={t}>
                {goalTermLabels[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-text-secondary">Prazo final</p>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => update("deadline", e.target.value)}
            className={`w-full ${field}`}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-text-secondary">Empresa</p>
          <select
            value={form.businessId}
            onChange={(e) => update("businessId", e.target.value)}
            className={`w-full ${field}`}
          >
            <option value="">Nenhuma</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

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
