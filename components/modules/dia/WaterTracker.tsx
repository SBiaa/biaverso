"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

type WaterTrackerProps = {
  dayId: string;
  initialCount: number;
};

export function WaterTracker({ dayId, initialCount }: WaterTrackerProps) {
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(i)}
              aria-label={`Marcar ${i + 1} de 8 copos`}
            >
              <Droplets
                size={22}
                className={i < count ? "text-accent" : "text-border"}
                fill={i < count ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>
        <span className="text-sm text-text-secondary">{count}/8</span>
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
