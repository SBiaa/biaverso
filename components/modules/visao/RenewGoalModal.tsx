"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

type RenewGoalModalProps = {
  goal: {
    id: string;
    title: string;
    target: string | null;
    deadline: string | null;
    progress: number;
  };
  onClose: () => void;
  onSaved: () => void;
};

/** Mesmo dia e mês, um ano depois — o ciclo mais comum de meta. */
function nextYearDeadline(iso: string | null) {
  if (!iso) return "";
  const [year, rest] = [Number(iso.slice(0, 4)), iso.slice(4, 10)];
  // 29/02 não existe no ano seguinte — cai no último dia de fevereiro.
  return `${year + 1}${rest === "-02-29" ? "-02-28" : rest}`;
}

const inputClass =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

export function RenewGoalModal({ goal, onClose, onSaved }: RenewGoalModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [close, setClose] = useState({
    status: goal.progress >= 100 ? "CONCLUIDO" : "NAO_ATINGIDO",
    progress: goal.progress,
    lesson: "",
  });
  const [next, setNext] = useState({
    title: goal.title,
    target: goal.target ?? "",
    deadline: nextYearDeadline(goal.deadline),
  });

  async function handleSubmit() {
    if (!next.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/vision/goals/measured/${goal.id}/renew`, {
        close: { ...close, progress: Number(close.progress) },
        next: { ...next, deadline: next.deadline || null },
      });
      onSaved();
      onClose();
    } catch (e) {
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
        className="flex max-h-full w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Renovar meta</h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          1. Encerrar a atual
        </p>
        <p className="text-sm text-text-primary">{goal.title}</p>

        <div className="flex gap-2">
          {(
            [
              ["CONCLUIDO", "Atingida"],
              ["NAO_ATINGIDO", "Não atingida"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setClose((p) => ({ ...p, status: value }))}
              className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${
                close.status === value
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-border text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
            <span>Resultado final</span>
            <span>{close.progress}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={close.progress}
            onChange={(e) => setClose((p) => ({ ...p, progress: Number(e.target.value) }))}
            className="w-full accent-accent"
          />
        </div>

        <textarea
          placeholder="Aprendizado: o que funcionou, o que não funcionou"
          value={close.lesson}
          onChange={(e) => setClose((p) => ({ ...p, lesson: e.target.value }))}
          rows={3}
          className={`resize-none ${inputClass}`}
        />

        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          2. Nova meta
        </p>
        <input
          placeholder="Título"
          value={next.title}
          onChange={(e) => setNext((p) => ({ ...p, title: e.target.value }))}
          className={inputClass}
        />
        <input
          placeholder="Meta (ex: R$10k/mês)"
          value={next.target}
          onChange={(e) => setNext((p) => ({ ...p, target: e.target.value }))}
          className={inputClass}
        />
        <div>
          <p className="mb-1 text-xs text-text-secondary">Prazo</p>
          <input
            type="date"
            value={next.deadline}
            onChange={(e) => setNext((p) => ({ ...p, deadline: e.target.value }))}
            className={`w-full ${inputClass}`}
          />
        </div>

        <ErrorNote message={error} />

        <div className="mt-2 flex gap-2">
          <Button onClick={handleSubmit} disabled={saving}>
            Encerrar e criar nova
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
