"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { useOptimisticList } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { routineTimeLabels } from "@/lib/labels";
import type { RoutineView } from "@/lib/beleza-shared";

/**
 * Rotinas do dia com checkbox. Marcar grava um CareRoutineLog na data — a
 * mesma lista aparece aqui e na seção Autocuidado do /dia.
 *
 * Cada rotina decide se os passos são marcáveis (`checklist`) ou uma lista
 * numerada só de leitura — a escolha vive na própria rotina, em Rotinas. Em
 * checklist a manhã pode acontecer em pedaços: "3 de 5" cabe na tela, e a
 * rotina fecha sozinha quando o último passo é marcado.
 */
export function TodayRoutines({
  routines: serverRoutines,
  date,
}: {
  routines: RoutineView[];
  /** Data-calendário ISO do dia mostrado. */
  date: string;
}) {
  const { items: routines, error, update } = useOptimisticList(serverRoutines);
  // O que ela abriu ou fechou na mão. Sem entrada aqui vale o padrão do modo:
  // em checklist os passos já nascem à vista, porque escondê-los atrás de um
  // clique era o que fazia a rotina parecer "tudo ou nada".
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});

  function toggleOpen(routineId: string, open: boolean) {
    setOpenOverrides((prev) => ({ ...prev, [routineId]: !open }));
  }

  function toggle(id: string) {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;

    const done = !routine.done;
    // Marcar a rotina inteira leva os passos junto, do mesmo jeito que o
    // servidor faz: senão a lista abaixo contaria outra história.
    update(
      id,
      { done, steps: routine.steps.map((s) => ({ ...s, done })) },
      () => api.post(`/api/beauty/routines/${id}/log`, { date, done }),
    );
  }

  function toggleStep(routineId: string, stepId: string) {
    const routine = routines.find((r) => r.id === routineId);
    const step = routine?.steps.find((s) => s.id === stepId);
    if (!routine || !step) return;

    const done = !step.done;
    const steps = routine.steps.map((s) => (s.id === stepId ? { ...s, done } : s));

    // A rotina fecha sozinha quando o último passo é marcado.
    update(routineId, { steps, done: steps.every((s) => s.done) }, () =>
      api.post(`/api/beauty/routines/${routineId}/steps/${stepId}/log`, {
        date,
        done,
      }),
    );
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
        const checklist = routine.checklist;
        const open = openOverrides[routine.id] ?? checklist;
        const doneSteps = routine.steps.filter((s) => s.done).length;
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
                      // Em checklist o que interessa é onde ela parou.
                      (checklist
                        ? ` · ${doneSteps} de ${routine.steps.length} passos`
                        : ` · ${routine.steps.length} ${routine.steps.length === 1 ? "passo" : "passos"}`)}
                  </p>
                </div>
              </button>

              {routine.steps.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleOpen(routine.id, open)}
                  aria-label={open ? "Esconder passos" : "Ver passos"}
                  className="text-text-secondary hover:text-text-primary"
                >
                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
            </div>

            {open && routine.steps.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2 pl-8">
                {routine.steps.map((step, index) => (
                  <li key={step.id} className="text-sm text-text-primary">
                    {checklist ? (
                      <button
                        type="button"
                        onClick={() => toggleStep(routine.id, step.id)}
                        className="flex w-full items-start gap-2 text-left"
                      >
                        {step.done ? (
                          <CheckCircle2
                            size={15}
                            className="mt-0.5 shrink-0 text-accent"
                          />
                        ) : (
                          <Circle
                            size={15}
                            className="mt-0.5 shrink-0 text-text-secondary"
                          />
                        )}
                        <span className={cn(step.done && "line-through opacity-60")}>
                          {step.title}
                          {step.productName && (
                            <span className="text-text-secondary">
                              {" "}
                              · {step.productName}
                            </span>
                          )}
                        </span>
                      </button>
                    ) : (
                      <>
                        <span className="text-text-secondary">{index + 1}.</span>{" "}
                        {step.title}
                        {step.productName && (
                          <span className="text-text-secondary">
                            {" "}
                            · {step.productName}
                          </span>
                        )}
                      </>
                    )}
                    {step.notes && (
                      <p
                        className={cn(
                          "text-xs text-text-secondary",
                          checklist ? "pl-6" : "pl-4",
                        )}
                      >
                        {step.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
