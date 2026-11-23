"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, ListPlus, Plus, Trash2 } from "lucide-react";
import { confirmAction, ErrorNote, IconButton, InlineEdit } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

/** `stage` só vem preenchido nas tarefas de produção dos clientes. */
export type SubtaskItem = { id: string; title: string; done: boolean; stage?: string | null };

/** De qual lista vem a tarefa dona dos passos. */
export type SubtaskParent = {
  kind: "task" | "production" | "collection" | "post";
  id: string;
};

function parentField(parent: SubtaskParent) {
  if (parent.kind === "task") return { taskId: parent.id };
  if (parent.kind === "production") return { productionTaskId: parent.id };
  if (parent.kind === "post") return { contentPostId: parent.id };
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

  async function add(title: string, stage?: string) {
    const trimmed = title.trim();
    if (!trimmed) return false;

    setSaving(true);
    setError(null);

    try {
      const created = await api.post<SubtaskItem>("/api/subtasks", {
        title: trimmed,
        stage: stage?.trim() || undefined,
        ...parentField(parent),
      });
      setSubtasks((prev) => [
        ...prev,
        { id: created.id, title: created.title, done: false, stage: created.stage ?? null },
      ]);
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

  /** Renomear direto na linha. O erro sobe para quem chamou. */
  async function rename(id: string, title: string) {
    await api.patch(`/api/subtasks/${id}`, { title });
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  }

  async function remove(id: string) {
    const title = subtasks.find((s) => s.id === id)?.title;
    const confirmed = await confirmAction({
      title: "Apagar este passo?",
      description: title ? `"${title}" sai da lista.` : undefined,
      confirmLabel: "Apagar",
      destructive: true,
    });
    if (!confirmed) return;

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

  /** Renomeia uma etapa: troca o nome em todos os passos que estão nela. */
  async function renameStage(from: string, to: string) {
    const target = to.trim();
    if (!target || target === from) return;

    const previous = subtasks;
    const ids = subtasks.filter((s) => s.stage === from).map((s) => s.id);

    setError(null);
    setSubtasks((prev) => prev.map((s) => (s.stage === from ? { ...s, stage: target } : s)));

    try {
      await Promise.all(ids.map((id) => api.patch(`/api/subtasks/${id}`, { stage: target })));
    } catch (e) {
      setSubtasks(previous);
      setError(errorMessage(e));
    }
  }

  return {
    subtasks,
    rename,
    renameStage,
    doneCount: subtasks.filter((s) => s.done).length,
    error,
    saving,
    add,
    toggle,
    remove,
  };
}

type SubtasksProps = Omit<ReturnType<typeof useSubtasks>, "doneCount" | "renameStage"> & {
  /** No template de rotina não há o que marcar: quem é feito é o passo do dia. */
  checkable?: boolean;
};

/** Passos de uma tarefa + campo para quebrar em mais um. */
export function SubtaskList({
  subtasks,
  error,
  saving,
  add,
  toggle,
  remove,
  rename,
  checkable = true,
}: SubtasksProps) {
  const [title, setTitle] = useState("");

  async function submit() {
    if (await add(title)) setTitle("");
  }

  return (
    <div className="flex flex-col gap-1 border-l border-border pl-3">
      {subtasks.map((subtask) => (
        <div key={subtask.id} className="group flex items-center gap-2 text-sm">
          {checkable ? (
            <button
              type="button"
              onClick={() => toggle(subtask.id)}
              aria-label={subtask.done ? "Desmarcar passo" : "Marcar passo"}
              className="-m-3 flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-hover"
            >
              {subtask.done ? (
                <CheckCircle2 size={14} className="text-accent-ink" />
              ) : (
                <Circle size={14} className="text-text-secondary" />
              )}
            </button>
          ) : (
            <Circle size={14} className="shrink-0 text-text-secondary/50" />
          )}
          <div className="min-w-0 flex-1">
            <InlineEdit
              value={subtask.title}
              ariaLabel="Passo"
              onSave={(title) => rename(subtask.id, title)}
              className={cn(
                "block text-text-primary",
                checkable && subtask.done && "text-text-secondary line-through",
              )}
            />
          </div>
          <IconButton
            title="Apagar passo"
            aria-label={`Apagar passo ${subtask.title}`}
            onClick={() => remove(subtask.id)}
            tone="danger"
            revealOnHover
          >
            <Trash2 size={15} />
          </IconButton>
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
        <IconButton
          title="Adicionar passo"
          onClick={() => void submit()}
          disabled={saving || !title.trim()}
          className="border border-border disabled:opacity-40"
        >
          <Plus size={15} />
        </IconButton>
      </div>

      <ErrorNote message={error} />
    </div>
  );
}

/** Botão que abre/fecha os passos e mostra o andamento (2/5). */
/**
 * Quais tarefas estão com os passos abertos. Fica no navegador (localStorage),
 * e não no banco: é só jeito de olhar a tela. Guardar é o que faz a escolha
 * durar — antes toda tarefa com passos reabria a cada carregamento, e uma
 * tarefa de 9 passos ocupava a tela como se fossem 9 tarefas.
 */
const OPEN_STORAGE_KEY = "biaverso:passos-abertos";
const openListeners = new Set<() => void>();

function readOpenRaw() {
  try {
    return localStorage.getItem(OPEN_STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parseOpen(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function subscribeOpen(callback: () => void) {
  openListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    openListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Passos abertos ou recolhidos de UMA tarefa. Nasce recolhido: o contador
 * (2/5) já diz quanto falta, e abrir é um toque. `key` precisa ser único entre
 * os tipos de tarefa (ex.: "production:abc").
 */
export function useSubtasksOpen(key: string): [boolean, () => void] {
  // No servidor não há localStorage: tudo recolhido, e o navegador acerta depois.
  const raw = useSyncExternalStore(subscribeOpen, readOpenRaw, () => "[]");
  const open = useMemo(() => parseOpen(raw).includes(key), [raw, key]);

  function toggle() {
    const list = parseOpen(readOpenRaw()).filter((k) => k !== key);
    if (!open) list.push(key);
    try {
      localStorage.setItem(OPEN_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Sem armazenamento (aba anônima cheia etc.): só não lembra.
    }
    openListeners.forEach((l) => l());
  }

  return [open, toggle];
}

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
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      title={total === 0 ? "Quebrar em passos" : open ? "Recolher os passos" : "Mostrar os passos"}
      aria-label={
        total === 0
          ? "Quebrar em passos"
          : `${open ? "Recolher" : "Mostrar"} os passos (${doneCount} de ${total} feitos)`
      }
      aria-expanded={open}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        total > 0 ? "text-text-secondary" : "text-text-secondary/60",
        "hover:bg-border hover:text-text-primary",
      )}
    >
      {/* Com passos, a setinha diz que dá para abrir e fechar; sem passos, o
          ícone de lista é o convite para quebrar a tarefa. */}
      {total > 0 ? <Chevron size={13} /> : <ListPlus size={13} />}
      {total > 0 && (
        <span className={cn(doneCount === total && "text-accent-ink")}>
          {doneCount}/{total}
        </span>
      )}
    </button>
  );
}
