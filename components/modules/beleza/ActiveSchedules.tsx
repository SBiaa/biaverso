"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import type { ScheduleView } from "@/lib/beleza-shared";
import { CycleDots, UrgencyPill } from "./shared";

/**
 * Cronogramas cíclicos na home. "Registrar etapa" grava a etapa da vez e gira
 * o ciclo — quem avança o `currentStep` é o servidor, então aqui só recarrega.
 */
export function ActiveSchedules({ schedules }: { schedules: ScheduleView[] }) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function registerStep(id: string) {
    setSavingId(id);
    setError(null);
    try {
      await api.post(`/api/beauty/schedules/${id}/log`, {});
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSavingId(null);
    }
  }

  if (schedules.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhum cronograma ativo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ErrorNote message={error} />

      {schedules.map((schedule) => {
        const currentStep = schedule.steps[schedule.currentStepIndex];

        return (
          <div
            key={schedule.id}
            className="flex flex-col gap-2 rounded-md border border-border px-3 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {schedule.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {currentStep
                    ? `Próxima etapa: ${currentStep.title}`
                    : "Sem etapas cadastradas"}
                </p>
              </div>
              {currentStep && (
                <UrgencyPill urgency={schedule.urgency} days={schedule.daysUntilNext} />
              )}
            </div>

            {schedule.steps.length > 0 && (
              <div className="flex items-center justify-between gap-2">
                <CycleDots
                  total={schedule.steps.length}
                  currentIndex={schedule.currentStepIndex}
                  titles={schedule.steps.map((s) => s.title)}
                />
                <Button
                  variant="secondary"
                  onClick={() => registerStep(schedule.id)}
                  disabled={savingId === schedule.id}
                  className="px-3 py-1 text-xs"
                >
                  <RotateCw size={13} />
                  Registrar etapa
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
