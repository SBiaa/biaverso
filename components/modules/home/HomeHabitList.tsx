"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { useOptimisticList } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type HabitItem = { id: string; name: string; done: boolean };

export function HomeHabitList({ items: serverItems }: { items: HabitItem[] }) {
  const { items, error, update } = useOptimisticList(serverItems);

  function toggle(id: string) {
    const done = !items.find((i) => i.id === id)?.done;
    update(id, { done }, () => api.patch(`/api/habit-logs/${id}`, { done }));
  }

  if (items.length === 0) {
    return <p className="text-sm text-text-secondary">Nenhum hábito cadastrado.</p>;
  }

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {items.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => toggle(h.id)}
              className="flex items-center gap-2 text-sm"
            >
              {h.done ? (
                <CheckCircle2 size={16} className="text-accent" />
              ) : (
                <Circle size={16} className="text-text-secondary" />
              )}
              <span
                className={cn(
                  "text-text-primary",
                  h.done && "text-text-secondary line-through",
                )}
              >
                {h.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <ErrorNote message={error} />
    </div>
  );
}
