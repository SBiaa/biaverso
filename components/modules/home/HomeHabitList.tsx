"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type HabitItem = { id: string; name: string; done: boolean };

export function HomeHabitList({ items: initialItems }: { items: HabitItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function toggle(id: string) {
    const previous = items;
    const nextDone = !items.find((i) => i.id === id)?.done;

    setError(null);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: nextDone } : i)));

    try {
      await api.patch(`/api/habit-logs/${id}`, { done: nextDone });
      startTransition(() => router.refresh());
    } catch (e) {
      setItems(previous);
      setError(errorMessage(e));
    }
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
