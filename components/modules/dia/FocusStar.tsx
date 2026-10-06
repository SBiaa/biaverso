"use client";

import { useEffect } from "react";
import { Star } from "lucide-react";
import { notify } from "@/components/ui";
import { useOptimisticValue } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { FocusKind } from "@/lib/day-focus";

/** Estrelinha que põe a tarefa no foco do dia (ou tira). O limite é checado no servidor. */
export function FocusStar({
  dayId,
  kind,
  taskId,
  focused,
  title,
}: {
  dayId: string;
  kind: FocusKind;
  taskId: string;
  focused: boolean;
  title: string;
}) {
  const { value, error, update } = useOptimisticValue(focused);

  // O servidor recusa o 4º item; a mensagem dele já explica o que fazer.
  useEffect(() => {
    if (error) notify(error, "error");
  }, [error]);

  return (
    <button
      type="button"
      onClick={() =>
        update(!value, () =>
          api.put("/api/day-focus", { dayId, kind, taskId, focused: !value }),
        )
      }
      aria-pressed={value}
      aria-label={value ? `Tirar ${title} do foco` : `Pôr ${title} no foco`}
      title={value ? "Tirar do foco do dia" : "Pôr no foco do dia"}
      className="flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-hover"
    >
      <Star
        size={15}
        className={cn(value ? "text-amber-500" : "text-text-secondary/50")}
        fill={value ? "currentColor" : "none"}
      />
    </button>
  );
}
