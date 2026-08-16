"use client";

import { ErrorNote } from "@/components/ui";
import { useOptimisticValue } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { Energy } from "@/app/generated/prisma/client";

const MOODS = ["😔", "😕", "😐", "🙂", "😄"];

const ENERGY_OPTIONS: { value: Energy; label: string }[] = [
  { value: "BAIXA", label: "Baixa" },
  { value: "MEDIA", label: "Média" },
  { value: "ALTA", label: "Alta" },
];

type MoodEnergySelectorProps = {
  dayId: string;
  initialMood: string | null;
  initialEnergy: Energy | null;
};

export function MoodEnergySelector({
  dayId,
  initialMood,
  initialEnergy,
}: MoodEnergySelectorProps) {
  // Humor e energia num valor só: são o mesmo PATCH e o mesmo aviso de erro,
  // e separados davam duas transições concorrentes para a mesma linha do dia.
  const { value, error, update } = useOptimisticValue({
    mood: initialMood,
    energy: initialEnergy,
  });
  const { mood, energy } = value;

  function save(patch: { mood?: string; energy?: Energy }) {
    update({ ...value, ...patch }, () =>
      api.patch(`/api/dias/${dayId}`, patch),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-text-primary">
          Como estou
        </p>
        <div className="flex gap-2">
          {MOODS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => save({ mood: emoji })}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-xl transition-colors",
                mood === emoji ? "bg-accent/10 ring-2 ring-accent" : "hover:bg-hover",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-text-primary">Energia</p>
        <div className="inline-flex rounded-lg border border-border p-1">
          {ENERGY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => save({ energy: option.value })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                energy === option.value
                  ? "bg-accent text-accent-contrast"
                  : "text-text-secondary hover:bg-hover",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorNote message={error} />
    </div>
  );
}
