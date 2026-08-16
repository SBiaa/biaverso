"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { useOptimisticList } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type HabitItem = { id: string; name: string; done: boolean };

type HabitChecklistProps = {
  items: HabitItem[];
};

export function HabitChecklist({ items: serverItems }: HabitChecklistProps) {
  const { items, error, update } = useOptimisticList(serverItems);

  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  function toggle(id: string) {
    const done = !items.find((i) => i.id === id)?.done;
    update(id, { done }, () => api.patch(`/api/habit-logs/${id}`, { done }));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">Hábitos</p>
        <span className="text-sm text-text-secondary">
          {done}/{total}
        </span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex items-center gap-2 text-sm"
            >
              {item.done ? (
                <CheckCircle2 size={16} className="text-accent" />
              ) : (
                <Circle size={16} className="text-text-secondary" />
              )}
              <span
                className={cn(
                  "text-text-primary",
                  item.done && "text-text-secondary line-through",
                )}
              >
                {item.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <ErrorNote message={error} />
      </div>
    </div>
  );
}
