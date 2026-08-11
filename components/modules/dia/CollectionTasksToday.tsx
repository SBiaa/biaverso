"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatDateBR, hexToRgba } from "@/lib/utils";
import { SubtaskList, SubtaskToggle, useSubtasks, type SubtaskItem } from "@/components/modules/tarefas/Subtasks";

export type CollectionTaskToday = {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  overdue: boolean;
  collectionId: string;
  collectionName: string;
  businessId: string;
  businessColor: string;
  subtasks: SubtaskItem[];
};

function TaskItem({
  task,
  onToggle,
}: {
  task: CollectionTaskToday;
  onToggle: (id: string) => void;
}) {
  const subtasks = useSubtasks({ kind: "collection", id: task.id }, task.subtasks);
  // Tarefa já quebrada nasce aberta: o ponto dos passos é ver por onde começar.
  const [open, setOpen] = useState(task.subtasks.length > 0 && !task.done);

  return (
    <li className="flex items-start gap-2">
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        className="mt-0.5 shrink-0"
        aria-label={task.done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
      >
        {task.done ? (
          <CheckCircle2 size={16} className="text-accent" />
        ) : (
          <Circle size={16} className="text-text-secondary" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm text-text-primary",
              task.done && "text-text-secondary line-through",
            )}
          >
            {task.title}
          </span>
          <SubtaskToggle
            open={open}
            onClick={() => setOpen((v) => !v)}
            doneCount={subtasks.doneCount}
            total={subtasks.subtasks.length}
          />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <Link
            href={`/negocios/${task.businessId}/colecoes/${task.collectionId}`}
            className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium hover:underline"
            style={{
              backgroundColor: hexToRgba(task.businessColor, 0.12),
              color: task.businessColor,
            }}
          >
            {task.collectionName}
          </Link>
          {task.overdue && !task.done && task.dueDate && (
            <span className="text-[11px] font-medium text-red-600">
              Atrasada desde {formatDateBR(new Date(task.dueDate))}
            </span>
          )}
        </div>
        {open && (
          <div className="mt-1.5">
            <SubtaskList {...subtasks} />
          </div>
        )}
      </div>
    </li>
  );
}

/** Tarefas de coleção que vencem hoje (ou já venceram e seguem abertas). */
export function CollectionTasksToday({ tasks }: { tasks: CollectionTaskToday[] }) {
  const [items, setItems] = useState(tasks);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: string) {
    const task = items.find((t) => t.id === id);
    if (!task) return;

    const previous = items;
    setError(null);
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

    try {
      await api.patch(`/api/collections/${task.collectionId}/tasks/${id}`, {
        done: !task.done,
      });
    } catch (e) {
      setItems(previous);
      setError(errorMessage(e));
    }
  }

  if (items.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-text-primary">
        Tarefas de coleções
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={toggle} />
        ))}
      </ul>
      <ErrorNote message={error} />
    </Card>
  );
}
