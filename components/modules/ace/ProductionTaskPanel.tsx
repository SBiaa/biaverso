"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { parseDateOnly, todayUtc } from "@/lib/utils";
import { projectHref } from "@/lib/projects-shared";
import { MISSED_DEADLINE_AFTER_DAYS } from "@/lib/ace-shared";
import type { ProductionPeekData } from "@/lib/production-peek";
import type { TaskStatus } from "@/app/generated/prisma/enums";
import { TaskPeek } from "@/components/modules/dia/TaskPeek";
import type { DateField, Patch, TaskEdit, WorkTask } from "@/components/modules/dia/WorkTasksToday";
import { useSubtasks } from "@/components/modules/tarefas/Subtasks";
import { usePriorityLevels } from "@/components/modules/tarefas/usePriorityLevels";
import { fetchProductionPeek } from "./ProductionPanelParts";

/**
 * O painel lateral da tarefa de produção fora do Dia: Kanban, calendário e
 * projetos abrem a tarefa no mesmo painel, em vez do modal com "Salvar".
 * Busca a tarefa pelo id e grava cada campo na hora, como no Dia.
 */
export function ProductionTaskPanel({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [data, setData] = useState<ProductionPeekData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProductionPeek(taskId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (!data) return <PanelPlaceholder error={error} onClose={onClose} />;
  return <LoadedPanel data={data} onClose={onClose} />;
}

/** Enquanto a tarefa chega: o painel já abre, para o clique não parecer perdido. */
function PanelPlaceholder({ error, onClose }: { error: string | null; onClose: () => void }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tarefa"
        aria-busy={!error}
        className="peek-in flex h-full w-full max-w-xl flex-col gap-4 border-l border-border bg-surface p-6 shadow-2xl"
      >
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : (
          <>
            <div className="h-28 animate-pulse rounded-lg bg-border/60" />
            <div className="h-6 w-2/3 animate-pulse rounded bg-border/60" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-border/60" />
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}

function LoadedPanel({ data, onClose }: { data: ProductionPeekData; onClose: () => void }) {
  const router = useRouter();
  const levels = usePriorityLevels();
  const [task, setTask] = useState<WorkTask>(data.task);
  const subtasks = useSubtasks({ kind: "production", id: task.id }, data.task.subtasks);

  // O contador de passos (2/5) do Kanban e do calendário vem do servidor:
  // recarrega quando um passo muda, menos na montagem.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    router.refresh();
  }, [subtasks.subtasks, router]);

  const url = `/api/ace/tasks/${task.id}`;

  /** Grava e reflete; se falhar, volta ao que era e o erro sobe. */
  async function saveStrict(_task: WorkTask, change: Partial<WorkTask>, body: object) {
    const previous = task;
    setTask((t) => ({ ...t, ...change }));
    try {
      await api.patch(url, body);
      router.refresh();
    } catch (e) {
      setTask(previous);
      throw e;
    }
  }

  /** Mesmo caminho, mas o erro vira aviso: é um clique, não um campo aberto. */
  async function save(change: Partial<WorkTask>, body: object) {
    try {
      await saveStrict(task, change, body);
    } catch (e) {
      notify(errorMessage(e), "error");
    }
  }

  function toggle(t: WorkTask) {
    const done = !t.done;
    return save(
      { done, completedAt: done ? new Date().toISOString() : null },
      { status: done ? "CONCLUIDO" : "A_FAZER" },
    );
  }

  function changeStatus(t: WorkTask, status: TaskStatus) {
    if (status === "CONCLUIDA") return t.done ? undefined : toggle(t);
    if (!t.done) return save({ progress: status }, { progress: status });
    return save(
      { progress: status, done: false, completedAt: null },
      { status: "A_FAZER", progress: status },
    );
  }

  function changeDate(t: WorkTask, field: DateField, value: string | null) {
    const date = value ? parseDateOnly(value) : null;
    if (value && !date) return undefined;
    const next = { ...t, [field]: date ? date.toISOString() : null };
    const today = todayUtc().getTime();
    const time = (d: string | null) => (d ? new Date(d).getTime() : null);
    const due = time(next.dueDate);
    const missed = due !== null && due < today - MISSED_DEADLINE_AFTER_DAYS * 24 * 60 * 60 * 1000;
    const overdue = !missed && [time(next.scheduledDate), due].some((x) => x !== null && x < today);
    return save({ [field]: next[field], overdue, missed }, { [field]: value });
  }

  async function edit(t: WorkTask, change: TaskEdit) {
    const { projectId, ...fields } = change;
    const local: Partial<WorkTask> = { ...fields };
    if (projectId !== undefined) {
      const option = data.projects.find((p) => p.id === projectId);
      local.project = option
        ? { id: option.id, name: option.name, href: projectHref(option.businessId, option.id) }
        : null;
    }
    await api.patch(url, change);
    setTask((prev) => ({ ...prev, ...local }));
    router.refresh();
  }

  return (
    <TaskPeek
      task={task}
      levels={levels}
      projects={data.projects}
      coverVersion={data.coverVersion}
      subtasks={subtasks}
      production={data.production}
      onClose={onClose}
      onToggle={toggle}
      onPatch={(_t, patch: Patch) => save(patch, patch)}
      onStatus={changeStatus}
      onDate={changeDate}
      onEdit={edit}
      onSave={saveStrict}
    />
  );
}
