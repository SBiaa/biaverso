"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ListPlus, Plus, Trash2 } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export type SubtaskItem = { id: string; title: string; done: boolean };

/** De qual lista vem a tarefa dona dos passos. */
export type SubtaskParent = { kind: "task" | "production" | "collection"; id: string };

function parentField(parent: SubtaskParent) {
  if (parent.kind === "task") return { taskId: parent.id };
  if (parent.kind === "production") return { productionTaskId: parent.id };
  return { collectionTaskId: parent.id };
}

/**
 * Estado das subtarefas de UMA tarefa. Como é um hook, cada linha da lista
 * precisa ser um componente próprio — não dá para chamar dentro do `map`.
 */
export function useSubtasks(parent: SubtaskParent, initial: SubtaskItem[]) {
  const [subtasks, setSubtasks] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return false;

    setSaving(true);
    setError(null);

    try {
      const created = await api.post<SubtaskItem>("/api/subtasks", {
        title: trimmed,
        ...parentField(parent),
      });
      setSubtasks((prev) => [...prev, { id: created.id, title: created.title, done: false }]);
      return true;
    } catch (e) {
      // Não entra na lista o que não foi gravado.
      setError(errorMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string) {
    const previous = subtasks;
    const nextDone = !subtasks.find((s) => s.id === id)?.done;

    setError(null);
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, done: nextDone } : s)));

    try {
      await api.patch(`/api/subtasks/${id}`, { done: nextDone });
    } catch (e) {
      setSubtasks(previous);
      setError(errorMessage(e));
    }
  }

  async function remove(id: string) {
    const previous = subtasks;

    setError(null);
    setSubtasks((prev) => prev.filter((s) => s.id !== id));

    try {
      await api.delete(`/api/subtasks/${id}`);
    } catch (e) {
      setSubtasks(previous);
      setError(errorMessage(e));
    }
  }

  return {
    subtasks,
    doneCount: subtasks.filter((s) => s.done).length,
    error,
    saving,
    add,
    toggle,
    remove,
  };
}

type SubtasksProps = Omit<ReturnType<typeof useSubtasks>, "doneCount">;

/** Passos de uma tarefa + campo para quebrar em mais um. */
export function SubtaskList({ subtasks, error, saving, add, toggle, remove }: SubtasksProps) {
  const [title, setTitle] = useState("");

  async function submit() {
    if (await add(title)) setTitle("");
  }

  return (
    <div className="flex flex-col gap-1 border-l border-border pl-3">
      {subtasks.map((subtask) => (
        <div key={subtask.id} className="group flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => toggle(subtask.id)}
            className="flex flex-1 items-center gap-2 text-left"
          >
            {subtask.done ? (
              <CheckCircle2 size={14} className="shrink-0 text-accent" />
            ) : (
              <Circle size={14} className="shrink-0 text-text-secondary" />
            )}
            <span
              className={cn(
                "text-text-primary",
                subtask.done && "text-text-secondary line-through",
              )}
            >
              {subtask.title}
            </span>
          </button>
          <button
            type="button"
            title="Apagar passo"
            onClick={() => remove(subtask.id)}
            className="shrink-0 text-text-secondary opacity-0 transition-opacity hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Quebrar em um passo…"
          className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="button"
          title="Adicionar passo"
          onClick={() => void submit()}
          disabled={saving || !title.trim()}
          className="shrink-0 rounded-md border border-border p-1 text-text-secondary hover:text-text-primary disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>

      <ErrorNote message={error} />
    </div>
  );
}

/** Botão que abre/fecha os passos e mostra o andamento (2/5). */
export function SubtaskToggle({
  open,
  onClick,
  doneCount,
  total,
}: {
  open: boolean;
  onClick: () => void;
  doneCount: number;
  total: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={total === 0 ? "Quebrar em passos" : "Ver os passos"}
      aria-expanded={open}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        total > 0 ? "text-text-secondary" : "text-text-secondary/60",
        "hover:bg-border hover:text-text-primary",
      )}
    >
      <ListPlus size={13} />
      {total > 0 && (
        <span className={cn(doneCount === total && "text-accent")}>
          {doneCount}/{total}
        </span>
      )}
    </button>
  );
}
