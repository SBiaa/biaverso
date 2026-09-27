"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { Badge, ErrorNote, type BadgeOrigin } from "@/components/ui";
import { useOptimisticList } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type TaskItem = { id: string; title: string; done: boolean; origin: BadgeOrigin };

export function HomeTaskList({ items: serverItems }: { items: TaskItem[] }) {
  const { items, error, update } = useOptimisticList(serverItems);

  const tasksByOrigin = items.reduce<Record<string, TaskItem[]>>((acc, task) => {
    (acc[task.origin] ??= []).push(task);
    return acc;
  }, {});

  function toggle(id: string) {
    const done = !items.find((t) => t.id === id)?.done;
    update(id, { done }, () => api.patch(`/api/tasks/${id}`, { done }));
  }

  if (items.length === 0) {
    return <p className="text-sm text-text-secondary">Nenhuma tarefa para hoje.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(tasksByOrigin).map(([origin, tasks]) => (
        <div key={origin} className="flex flex-col gap-1.5">
          <Badge origin={origin as BadgeOrigin} />
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => toggle(task.id)}
              className="flex items-center gap-2 pl-1 text-sm"
            >
              {task.done ? (
                <CheckCircle2 size={16} className="text-accent" />
              ) : (
                <Circle size={16} className="text-text-secondary" />
              )}
              <span
                className={cn(
                  "text-text-primary",
                  task.done && "text-text-secondary line-through",
                )}
              >
                {task.title}
              </span>
            </button>
          ))}
        </div>
      ))}
      <ErrorNote message={error} />
    </div>
  );
}
