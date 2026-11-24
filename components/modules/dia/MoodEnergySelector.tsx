"use client";

import { ErrorNote } from "@/components/ui";
import { useOptimisticValue } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { moodLabels, moodScale } from "@/lib/labels";
import type { Energy } from "@/app/generated/prisma/client";

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
        <p id={`humor-${dayId}`} className="mb-2 text-sm font-semibold text-text-primary">
          Como estou
        </p>
        {/* Cada carinha tem nome e diz se está marcada; antes era só o emoji,
            sem nenhuma pista de qual estava escolhido fora o anel colorido. */}
        <div className="flex gap-2" role="group" aria-labelledby={`humor-${dayId}`}>
          {moodScale.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => save({ mood: emoji })}
              aria-label={moodLabels[emoji]}
              aria-pressed={mood === emoji}
              title={moodLabels[emoji]}
              className={cn(
                "flex size-11 items-center justify-center rounded-full text-xl transition-colors",
                mood === emoji ? "bg-accent/10 ring-2 ring-accent" : "hover:bg-hover",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p id={`energia-${dayId}`} className="mb-2 text-sm font-semibold text-text-primary">
          Energia
        </p>
        <div
          className="inline-flex rounded-lg border border-border p-1"
          role="group"
          aria-labelledby={`energia-${dayId}`}
        >
          {ENERGY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => save({ energy: option.value })}
              aria-pressed={energy === option.value}
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
