"use client";

import { useState } from "react";
import { Button, ErrorNote, Modal, ModalActions } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { formatGoalValue, goalProgress, parseGoalAmount } from "@/lib/vision-shared";

export type RenewableGoal = {
  id: string;
  title: string;
  target: string | null;
  deadline: string | null;
  progress: number;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
};

/** O que a rota devolve: a meta encerrada e a nova, como vieram do banco. */
export type RenewResult<T> = { closed: T; created: T };

const field =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

/** Mesmo dia e mês, um ano depois — o ciclo mais comum de meta. */
function nextYearDeadline(iso: string | null) {
  if (!iso) return "";
  const year = Number(iso.slice(0, 4));
  const rest = iso.slice(4, 10);
  // 29/02 não existe no ano seguinte — cai no último dia de fevereiro.
  return `${year + 1}${rest === "-02-29" ? "-02-28" : rest}`;
}

function amountText(value: number | null) {
  return value === null ? "" : String(value).replace(".", ",");
}

export function RenewGoalModal<T>({
  goal,
  onClose,
  onRenewed,
}: {
  goal: RenewableGoal;
  onClose: () => void;
  onRenewed: (result: RenewResult<T>) => void;
}) {
  const hasTarget = goal.targetValue !== null && goal.targetValue > 0;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [close, setClose] = useState({
    status: goalProgress(goal) >= 100 ? "CONCLUIDO" : "NAO_ATINGIDO",
    currentValue: amountText(goal.currentValue),
    progress: goal.progress,
    lesson: "",
  });
  const [next, setNext] = useState({
    title: goal.title,
    target: goal.target ?? "",
    targetValue: amountText(goal.targetValue),
    deadline: nextYearDeadline(goal.deadline),
  });

  async function handleSubmit() {
    if (!next.title.trim()) return;

    const currentValue = parseGoalAmount(close.currentValue);
    const targetValue = parseGoalAmount(next.targetValue);
    if (currentValue === undefined || targetValue === undefined) {
      setError("Valor inválido. Use algo como 1800, 1.800 ou 7k.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await api.post<RenewResult<T>>(
        `/api/vision/goals/measured/${goal.id}/renew`,
        {
          close: {
            status: close.status,
            lesson: close.lesson,
            ...(hasTarget
              ? { currentValue: currentValue ?? 0 }
              : { progress: Number(close.progress) }),
          },
          next: {
            title: next.title,
            target: next.target,
            targetValue,
            deadline: next.deadline || null,
          },
        },
      );
      onRenewed(result);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Renovar meta" onClose={onClose} onSubmit={handleSubmit}>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        1. Encerrar a atual
      </p>
      <p className="text-sm text-text-primary">{goal.title}</p>

      <div className="flex gap-2" role="group" aria-label="Resultado">
        {(
          [
            ["CONCLUIDO", "Atingida"],
            ["NAO_ATINGIDO", "Não atingida"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={close.status === value}
            onClick={() => setClose((p) => ({ ...p, status: value }))}
            className={cn(
              "flex-1 rounded-md border px-3 py-1.5 text-sm",
              close.status === value
                ? "border-accent bg-accent/10 text-text-primary"
                : "border-border text-text-secondary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {hasTarget ? (
        <div>
          <p className="mb-1 text-xs text-text-secondary">
            Resultado final (meta: {formatGoalValue(goal.targetValue!, goal.unit)})
          </p>
          <input
            value={close.currentValue}
            onChange={(e) => setClose((p) => ({ ...p, currentValue: e.target.value }))}
            aria-label="Resultado final"
            className={`w-full ${field}`}
          />
        </div>
      ) : (
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
            aria-label="Resultado final"
            className="w-full accent-accent"
          />
        </div>
      )}

      <textarea
        placeholder="Aprendizado: o que funcionou, o que não funcionou"
        value={close.lesson}
        onChange={(e) => setClose((p) => ({ ...p, lesson: e.target.value }))}
        rows={3}
        aria-label="Aprendizado"
        className={`resize-none ${field}`}
      />

      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        2. Nova meta
      </p>
      <input
        placeholder="Título"
        value={next.title}
        onChange={(e) => setNext((p) => ({ ...p, title: e.target.value }))}
        aria-label="Título da nova meta"
        className={field}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-text-secondary">
            Meta{goal.unit ? ` (${goal.unit})` : ""}
          </p>
          {hasTarget || !goal.target ? (
            <input
              placeholder="Ex.: 12000"
              value={next.targetValue}
              onChange={(e) => setNext((p) => ({ ...p, targetValue: e.target.value }))}
              aria-label="Meta da nova"
              className={`w-full ${field}`}
            />
          ) : (
            <input
              value={next.target}
              onChange={(e) => setNext((p) => ({ ...p, target: e.target.value }))}
              aria-label="Meta da nova"
              className={`w-full ${field}`}
            />
          )}
        </div>
        <div>
          <p className="mb-1 text-xs text-text-secondary">Prazo final</p>
          <input
            type="date"
            value={next.deadline}
            onChange={(e) => setNext((p) => ({ ...p, deadline: e.target.value }))}
            aria-label="Prazo da nova meta"
            className={`w-full ${field}`}
          />
        </div>
      </div>

      <ErrorNote message={error} />

      <ModalActions>
        <Button type="submit" disabled={saving}>
          Encerrar e criar nova
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </ModalActions>
    </Modal>
  );
}
