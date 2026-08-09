"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type HabitItem = { id: string; name: string; done: boolean };

type HabitChecklistProps = {
  items: HabitItem[];
};

export function HabitChecklist({ items: initialItems }: HabitChecklistProps) {
  const [items, setItems] = useState(initialItems);

  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  function toggle(id: string) {
    const nextDone = !items.find((i) => i.id === id)?.done;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, done: nextDone } : i)),
    );
    fetch(`/api/habit-logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: nextDone }),
    });
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
    </div>
  );
}
