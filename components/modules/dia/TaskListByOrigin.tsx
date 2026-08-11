"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import {
  Badge,
  BusinessBadge,
  Button,
  ErrorNote,
  originLabels,
  type BadgeOrigin,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type TaskItem = {
  id: string;
  title: string;
  done: boolean;
  origin: BadgeOrigin;
  /** Null nas avulsas — só rotina/faxina ganham selo de tipo. */
  typeLabel: string | null;
  business: { name: string; color: string } | null;
  overdue: boolean;
};

type TaskListByOriginProps = {
  dayId: string;
  /** Data do dia aberto (YYYY-MM-DD) — a tarefa vence no dia que está na tela, não em "hoje". */
  dayDate: string;
  /** Dia aberto já passou: o que for criado aqui já nasce atrasado. */
  dayInPast: boolean;
  initialTasks: TaskItem[];
};

const originOptions = Object.keys(originLabels) as BadgeOrigin[];

export function TaskListByOrigin({
  dayId,
  dayDate,
  dayInPast,
  initialTasks,
}: TaskListByOriginProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState<BadgeOrigin>("PESSOAL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tasksByOrigin = tasks.reduce<Record<string, TaskItem[]>>((acc, task) => {
    (acc[task.origin] ??= []).push(task);
    return acc;
  }, {});

  async function toggle(id: string) {
    const previous = tasks;
    const nextDone = !tasks.find((t) => t.id === id)?.done;

    setError(null);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: nextDone } : t)));

    try {
      await api.patch(`/api/tasks/${id}`, { done: nextDone });
    } catch (e) {
      setTasks(previous);
      setError(errorMessage(e));
    }
  }

  async function addTask() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const task = await api.post<{ id: string; title: string }>("/api/tasks", {
        title: title.trim(),
        origin,
        dayId,
        dueDate: dayDate,
      });
      setTasks((prev) => [
        ...prev,
        {
          id: task.id,
          title: task.title,
          done: false,
          origin,
          typeLabel: null,
          business: null,
          overdue: dayInPast,
        },
      ]);
      setTitle("");
      setShowForm(false);
    } catch (e) {
      // A tarefa não entra na lista se não foi gravada.
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ErrorNote message={error} />

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
                className="flex w-full items-center gap-2 pl-1 text-left text-sm"
              >
                {task.done ? (
                  <CheckCircle2 size={16} className="shrink-0 text-accent" />
                ) : (
                  <Circle size={16} className="shrink-0 text-text-secondary" />
                )}
                <span
                  className={cn(
                    "flex-1 truncate text-text-primary",
                    task.done && "text-text-secondary line-through",
                  )}
                >
                  {task.title}
                </span>
                {/* Selos à direita: os títulos ficam alinhados numa coluna só. */}
                <span className="flex shrink-0 items-center gap-1.5">
                  {task.typeLabel && <Badge>{task.typeLabel}</Badge>}
                  {task.business && <BusinessBadge business={task.business} />}
                  {task.overdue && !task.done && (
                    <span className="whitespace-nowrap rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white">
                      Atrasado
                    </span>
                  )}
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
