"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { Badge, Button, originLabels, type BadgeOrigin } from "@/components/ui";
import { cn } from "@/lib/utils";

type TaskItem = { id: string; title: string; done: boolean; origin: BadgeOrigin };

type TaskListByOriginProps = {
  dayId: string;
  initialTasks: TaskItem[];
};

const originOptions = Object.keys(originLabels) as BadgeOrigin[];

export function TaskListByOrigin({ dayId, initialTasks }: TaskListByOriginProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState<BadgeOrigin>("PESSOAL");
  const [saving, setSaving] = useState(false);

  const tasksByOrigin = tasks.reduce<Record<string, TaskItem[]>>((acc, task) => {
    (acc[task.origin] ??= []).push(task);
    return acc;
  }, {});

  function toggle(id: string) {
    const nextDone = !tasks.find((t) => t.id === id)?.done;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: nextDone } : t)),
    );
    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: nextDone }),
    });
  }

  async function addTask() {
    if (!title.trim()) return;
    setSaving(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        origin,
        dayId,
        dueDate: today.toISOString(),
      }),
    });
    const task = await response.json();
    setTasks((prev) => [...prev, { id: task.id, title: task.title, done: false, origin }]);
    setTitle("");
    setSaving(false);
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhuma tarefa para hoje.</p>
      ) : (
        Object.entries(tasksByOrigin).map(([taskOrigin, items]) => (
          <div key={taskOrigin} className="flex flex-col gap-1.5">
            <Badge origin={taskOrigin as BadgeOrigin} />
            {items.map((task) => (
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
        ))
      )}

      {showForm ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da tarefa"
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value as BadgeOrigin)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            {originOptions.map((o) => (
              <option key={o} value={o}>
                {originLabels[o]}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button onClick={addTask} disabled={saving}>
              Salvar
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setShowForm(true)}>
          <Plus size={16} />
          Adicionar tarefa avulsa
        </Button>
      )}
    </div>
  );
}
