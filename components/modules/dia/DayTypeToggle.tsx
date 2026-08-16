"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmAction, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { DayType } from "@/app/generated/prisma/client";

type DayTypeToggleProps = {
  dayId: string;
  initialType: DayType;
};

const OPTIONS: { value: DayType; label: string }[] = [
  { value: "NORMAL", label: "Dia Normal" },
  { value: "FAXINA", label: "Dia de Faxina" },
];

export function DayTypeToggle({ dayId, initialType }: DayTypeToggleProps) {
  const [type, setType] = useState(initialType);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleChange(value: DayType) {
    if (value === type) return;

    const targetLabel = OPTIONS.find((o) => o.value === value)?.label ?? value;
    const confirmed = await confirmAction({
      title: `Trocar para ${targetLabel}?`,
      description:
        "As tarefas de rotina de hoje são substituídas. As avulsas ficam.",
      confirmLabel: "Trocar",
    });
    if (!confirmed) return;

    const previous = type;
    setError(null);
    setType(value);

    try {
      await api.patch(`/api/dias/${dayId}`, { type: value });
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      // As tarefas de rotina não foram trocadas, então o botão volta ao que era.
      setType(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="inline-flex self-start rounded-lg border border-border p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={isPending}
          onClick={() => handleChange(option.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
            type === option.value
              ? "bg-accent text-white"
              : "text-text-secondary hover:bg-hover",
          )}
        >
          {option.label}
        </button>
      ))}
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
