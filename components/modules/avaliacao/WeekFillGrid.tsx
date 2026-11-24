"use client";

import { startTransition, useOptimistic, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { WeekGridDay, WeekGridRow } from "@/lib/avaliacao";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type Change =
  | { kind: "cell"; id: string; done: boolean }
  | { kind: "day"; id: string; reviewed: boolean };

/**
 * A semana inteira numa grade: marcar o que foi feito e conferir cada dia.
 *
 * Os valores de base são sempre os do servidor; a mudança otimista vale só
 * enquanto a transição está em pé (mesmo padrão do `useOptimisticList`).
 */
export function WeekFillGrid({
  days,
  habits,
  house,
}: {
  days: WeekGridDay[];
  habits: WeekGridRow[];
  house: WeekGridRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [overrides, apply] = useOptimistic(
    {} as Record<string, boolean>,
    (current, change: Change) => ({
      ...current,
      [`${change.kind}:${change.id}`]: change.kind === "cell" ? change.done : change.reviewed,
    }),
  );

  function save(change: Change, request: () => Promise<unknown>) {
    startTransition(async () => {
      apply(change);
      setError(null);
      try {
        await request();
        router.refresh();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  }

  const isDone = (cell: { id: string; done: boolean }) =>
    overrides[`cell:${cell.id}`] ?? cell.done;
  const isReviewed = (day: WeekGridDay) =>
    day.dayId ? (overrides[`day:${day.dayId}`] ?? day.reviewed) : false;

  function toggleCell(row: WeekGridRow, cell: { id: string; done: boolean }) {
    const done = !isDone(cell);
    const url = row.kind === "habit" ? `/api/habit-logs/${cell.id}` : `/api/tasks/${cell.id}`;
    save({ kind: "cell", id: cell.id, done }, () => api.patch(url, { done }));
  }

  function toggleDay(day: WeekGridDay) {
    if (!day.dayId) return;
    const reviewed = !isReviewed(day);
    save({ kind: "day", id: day.dayId, reviewed }, () =>
      api.patch(`/api/dias/${day.dayId}`, { reviewed }),
    );
  }

  const past = days.filter((d) => !d.future);
  const reviewedCount = past.filter(isReviewed).length;

  function section(title: string, rows: WeekGridRow[]) {
    if (rows.length === 0) return null;
    return (
      <>
        <tr>
          <th
            scope="colgroup"
            colSpan={8}
            className="pt-3 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary"
          >
            {title}
          </th>
        </tr>
        {rows.map((row) => (
          <tr key={row.key} className="border-t border-border">
            <th
              scope="row"
              className="sticky left-0 z-10 w-24 bg-surface py-1 pr-2 text-left text-xs leading-tight font-normal text-text-primary sm:w-auto sm:text-sm"
            >
              {row.name}
            </th>
            {row.cells.map((cell, i) => {
              const day = days[i];
              const reviewed = isReviewed(day);
              if (!cell || day.future) {
                return (
                  <td key={i} className="text-center text-text-secondary" aria-hidden>
                    ·
                  </td>
                );
              }
              const done = isDone(cell);
              return (
                <td key={i} className={cn("text-center", !reviewed && "bg-border/30")}>
                  <button
                    type="button"
                    onClick={() => toggleCell(row, cell)}
                    aria-pressed={done}
                    aria-label={`${row.name}, ${WEEKDAYS[i]}: ${done ? "feito" : "não feito"}`}
                    className="inline-flex h-11 w-11 items-center justify-center"
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md border",
                        done
                          ? "border-accent bg-accent text-accent-contrast"
                          : "border-border bg-surface",
                      )}
                    >
                      {done && <Check size={14} strokeWidth={3} />}
                    </span>
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </>
    );
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-text-primary">Completar a semana</h2>
        <span className="text-sm text-text-secondary">
          {reviewedCount} de {past.length} {past.length === 1 ? "dia conferido" : "dias conferidos"}
        </span>
      </div>
      <p className="mb-3 text-sm text-text-secondary">
        Marque o que você fez e depois toque em <strong>Conferir</strong> no dia. Dia não
        conferido fica fora das contas, em vez de contar como não feito.
      </p>

      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[400px] border-collapse">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface">
                <span className="sr-only">Item</span>
              </th>
              {days.map((day, i) => {
                const reviewed = isReviewed(day);
                return (
                  <th key={day.date} scope="col" className="px-0.5 pb-1 align-bottom">
                    <div className="text-xs font-medium text-text-secondary">{WEEKDAYS[i]}</div>
                    <div className="text-sm font-semibold text-text-primary">
                      {Number(day.date.slice(8, 10))}
                    </div>
                    {day.type === "FAXINA" && (
                      <div className="text-[10px] text-text-secondary">faxina</div>
                    )}
                    {!day.future && day.dayId && (
                      <button
                        type="button"
                        onClick={() => toggleDay(day)}
                        aria-pressed={reviewed}
                        aria-label={`${WEEKDAYS[i]} ${Number(day.date.slice(8, 10))}: ${reviewed ? "conferido, toque para desfazer" : "conferir dia"}`}
                        className={cn(
                          "mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-md px-1 text-[11px] font-medium",
                          reviewed
                            ? "bg-accent/15 text-accent-ink"
                            : "border border-dashed border-border text-text-secondary",
                        )}
                      >
                        {reviewed ? (
                          <span className="inline-flex items-center gap-0.5">
                            <Check size={12} strokeWidth={3} /> Ok
                          </span>
                        ) : (
                          "Conferir"
                        )}
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {section("Hábitos", habits)}
            {section("Casa", house)}
          </tbody>
        </table>
      </div>

      <div className="mt-2">
        <ErrorNote message={error} />
      </div>
    </div>
  );
}
