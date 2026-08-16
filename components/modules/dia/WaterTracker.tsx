"use client";

import { Droplets } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { useOptimisticValue } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { formatWaterProgress, type UserSettingsValues } from "@/lib/settings-shared";

type WaterTrackerProps = {
  dayId: string;
  initialCount: number;
  settings: UserSettingsValues;
};

export function WaterTracker({ dayId, initialCount, settings }: WaterTrackerProps) {
  const { value: count, error, update } = useOptimisticValue(initialCount);

  // Quem já bebeu mais que a meta continua vendo tudo que marcou, mesmo depois
  // de a meta ser reduzida nas configurações.
  const slots = Math.max(settings.waterGoal, count);

  function handleClick(index: number) {
    // Clicar no copo que já é o último desmarca; qualquer outro define o total.
    const next = index + 1 === count ? count - 1 : index + 1;
    update(next, () => api.put("/api/water-logs", { dayId, count: next }));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: slots }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(i)}
              aria-label={`Marcar ${i + 1} de ${settings.waterGoal} copos`}
            >
              <Droplets
                size={22}
                className={i < count ? "text-accent" : "text-border"}
                fill={i < count ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>
        <span className="text-sm text-text-secondary">
          {formatWaterProgress(count, settings)}
        </span>
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
