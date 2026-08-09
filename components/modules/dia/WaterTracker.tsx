"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";

type WaterTrackerProps = {
  dayId: string;
  initialCount: number;
};

export function WaterTracker({ dayId, initialCount }: WaterTrackerProps) {
  const [count, setCount] = useState(initialCount);

  function handleClick(index: number) {
    const next = index + 1 === count ? count - 1 : index + 1;
    setCount(next);
    fetch("/api/water-logs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayId, count: next }),
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 8 }, (_, i) => (
          <button key={i} type="button" onClick={() => handleClick(i)}>
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
  );
}
