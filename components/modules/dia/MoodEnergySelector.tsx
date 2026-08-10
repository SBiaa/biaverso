"use client";

import { useState } from "react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
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
  const [mood, setMood] = useState(initialMood);
  const [energy, setEnergy] = useState(initialEnergy);
  const [error, setError] = useState<string | null>(null);

  async function save(patch: { mood?: string; energy?: Energy }) {
    const previous = { mood, energy };
    setError(null);

    try {
      await api.patch(`/api/dias/${dayId}`, patch);
    } catch (e) {
      // Desfaz a seleção otimista se o salvamento não passou.
      setMood(previous.mood);
      setEnergy(previous.energy);
      setError(errorMessage(e));
    }
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
              onClick={() => {
                setMood(emoji);
                save({ mood: emoji });
              }}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-xl transition-colors",
                mood === emoji ? "bg-accent/10 ring-2 ring-accent" : "hover:bg-black/[0.03]",
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
              onClick={() => {
                setEnergy(option.value);
                save({ energy: option.value });
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                energy === option.value
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-black/[0.03]",
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
