"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Badge, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type Item = { id: string; title: string; status: string };

export function AceTasksToday({ initialTasks }: { initialTasks: Item[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const previous = tasks;
    const nextStatus = task.status === "CONCLUIDO" ? "A_FAZER" : "CONCLUIDO";

    setError(null);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));

    try {
      await api.patch(`/api/ace/tasks/${id}`, { status: nextStatus });
    } catch (e) {
      setTasks(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Badge origin="ACE" />
      {tasks.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhuma tarefa de produção para hoje.</p>
      ) : (
        tasks.map((task) => {
          const done = task.status === "CONCLUIDO";
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => toggle(task.id)}
              className="flex items-center gap-2 pl-1 text-sm"
            >
              {done ? (
                <CheckCircle2 size={16} className="text-accent" />
              ) : (
                <Circle size={16} className="text-text-secondary" />
              )}
              <span className={cn("text-text-primary", done && "text-text-secondary line-through")}>
                {task.title}
              </span>
            </button>
          );
        })
      )}
      <ErrorNote message={error} />
    </div>
  );
}
