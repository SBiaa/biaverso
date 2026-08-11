"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Circle, GripVertical, Plus, Trash2 } from "lucide-react";
import { Card, Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatDateBR, todayUtc } from "@/lib/utils";

export type CollectionTask = {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  dueDate: string | null;
};

const emptyForm = { title: "", description: "", dueDate: "" };

function SortableTask({
  task,
  onToggle,
  onDelete,
}: {
  task: CollectionTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const overdue =
    !task.done &&
    task.dueDate !== null &&
    new Date(task.dueDate).getTime() < todayUtc().getTime();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-md border border-border px-2 py-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reordenar"
        className="mt-0.5 cursor-grab text-text-secondary"
      >
        <GripVertical size={16} />
      </button>

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
        <p
          className={cn(
            "text-sm text-text-primary",
            task.done && "text-text-secondary line-through",
          )}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-text-secondary">{task.description}</p>
        )}
        {task.dueDate && (
          <p
            className={cn(
              "text-xs",
              overdue ? "font-medium text-red-600" : "text-text-secondary",
            )}
          >
            {overdue ? "Atrasada — " : "Prazo: "}
            {formatDateBR(new Date(task.dueDate))}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label={`Remover ${task.title}`}
        className="mt-0.5 text-text-secondary hover:text-red-600"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function CollectionTasksSection({
  collectionId,
  initialTasks,
}: {
  collectionId: string;
  initialTasks: CollectionTask[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Um toque curto não pode virar arrasto, senão marcar a tarefa no celular
  // move a lista em vez de concluir.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const doneCount = tasks.filter((t) => t.done).length;
  const progress = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  async function add() {
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<CollectionTask>(
        `/api/collections/${collectionId}/tasks`,
        {
          title: form.title,
          description: form.description || null,
          dueDate: form.dueDate || null,
        },
      );
      setTasks((prev) => [...prev, created]);
      setForm(emptyForm);
      setAdding(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const previous = tasks;
    setError(null);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

    try {
      await api.patch(`/api/collections/${collectionId}/tasks/${id}`, {
        done: !task.done,
      });
    } catch (e) {
      setTasks(previous);
      setError(errorMessage(e));
    }
  }

  async function remove(id: string) {
    const previous = tasks;
    setError(null);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.delete(`/api/collections/${collectionId}/tasks/${id}`);
    } catch (e) {
      setTasks(previous);
      setError(errorMessage(e));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previous = tasks;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const next = arrayMove(tasks, oldIndex, newIndex);

    setError(null);
    setTasks(next);

    try {
      await api.post(`/api/collections/${collectionId}/tasks/reorder`, {
        ids: next.map((t) => t.id),
      });
    } catch (e) {
      setTasks(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Tarefas</h2>
        {tasks.length > 0 && (
          <span className="text-xs text-text-secondary">
            {doneCount}/{tasks.length} · {progress}%
          </span>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {tasks.length === 0 && !adding ? (
        <p className="text-sm text-text-secondary">Nenhuma tarefa nesta coleção.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1.5">
              {tasks.map((task) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onToggle={toggle}
                  onDelete={remove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {adding ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="O que precisa ser feito?"
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição (opcional)"
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            <Button type="button" onClick={add} disabled={saving || !form.title.trim()}>
              Adicionar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAdding(false);
                setForm(emptyForm);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setAdding(true)}
          className="self-start"
        >
          <Plus size={14} />
          Nova tarefa
        </Button>
      )}

      <ErrorNote message={error} />
    </Card>
  );
}
