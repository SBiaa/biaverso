"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  async function handleChange(value: DayType) {
    if (value === type) return;

    const targetLabel = OPTIONS.find((o) => o.value === value)?.label ?? value;
    const confirmed = window.confirm(
      `Trocar para ${targetLabel} vai substituir as tarefas de rotina de hoje. Tarefas avulsas serão mantidas. Confirmar?`,
    );
    if (!confirmed) return;

    setType(value);
    await fetch(`/api/dias/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: value }),
    });
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="inline-flex rounded-lg border border-border p-1">
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
              : "text-text-secondary hover:bg-black/[0.03]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
