"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatWaterProgress, type UserSettingsValues } from "@/lib/settings-shared";

type WaterTrackerProps = {
  dayId: string;
  initialCount: number;
  settings: UserSettingsValues;
};

export function WaterTracker({ dayId, initialCount, settings }: WaterTrackerProps) {
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);

  // Quem já bebeu mais que a meta continua vendo tudo que marcou, mesmo depois
  // de a meta ser reduzida nas configurações.
  const slots = Math.max(settings.waterGoal, count);

  async function handleClick(index: number) {
    const previous = count;
    const next = index + 1 === count ? count - 1 : index + 1;

    setError(null);
    setCount(next);

    try {
      await api.put("/api/water-logs", { dayId, count: next });
    } catch (e) {
      setCount(previous);
      setError(errorMessage(e));
    }
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
