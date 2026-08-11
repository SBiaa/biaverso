"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { routineTimeLabels } from "@/lib/labels";
import type { RoutineView } from "@/lib/beleza-shared";

/**
 * Rotinas do dia com checkbox. Marcar grava um CareRoutineLog na data — a
 * mesma lista aparece aqui e na seção Autocuidado do /dia.
 */
export function TodayRoutines({
  routines: initialRoutines,
  date,
}: {
  routines: RoutineView[];
  /** Data-calendário ISO do dia mostrado. */
  date: string;
}) {
  const [routines, setRoutines] = useState(initialRoutines);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: string) {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;

    const previous = routines;
    const done = !routine.done;

    setError(null);
    setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, done } : r)));

    try {
      await api.post(`/api/beauty/routines/${id}/log`, { date, done });
    } catch (e) {
      // Volta ao estado anterior: sem isso o check ficava marcado só na tela.
      setRoutines(previous);
      setError(errorMessage(e));
    }
  }

  if (routines.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhuma rotina cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ErrorNote message={error} />

      {routines.map((routine) => {
        const isOpen = expanded === routine.id;
        return (
          <div
            key={routine.id}
            className="rounded-md border border-border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggle(routine.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                {routine.done ? (
                  <CheckCircle2 size={18} className="shrink-0 text-accent" />
                ) : (
                  <Circle size={18} className="shrink-0 text-text-secondary" />
                )}
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium text-text-primary",
                      routine.done && "line-through opacity-60",
                    )}
                  >
                    {routine.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {routineTimeLabels[routine.timeOfDay]}
                    {routine.steps.length > 0 &&
                      ` · ${routine.steps.length} ${routine.steps.length === 1 ? "passo" : "passos"}`}
                  </p>
                </div>
              </button>

              {routine.steps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : routine.id)}
                  aria-label={isOpen ? "Esconder passos" : "Ver passos"}
                  className="text-text-secondary hover:text-text-primary"
                >
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
            </div>

            {isOpen && (
              <ol className="mt-2 flex flex-col gap-1 border-t border-border pt-2 pl-8">
                {routine.steps.map((step, index) => (
                  <li key={step.id} className="text-sm text-text-primary">
                    <span className="text-text-secondary">{index + 1}.</span>{" "}
                    {step.title}
                    {step.productName && (
                      <span className="text-text-secondary"> · {step.productName}</span>
                    )}
                    {step.notes && (
                      <p className="pl-4 text-xs text-text-secondary">{step.notes}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}
