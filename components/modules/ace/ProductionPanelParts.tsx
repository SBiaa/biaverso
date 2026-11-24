"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { Button, confirmAction, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { priorityLabels, productionStatusLabels, productionTypeLabels } from "@/lib/labels";
import { addUtcDays, cn, formatDateBR, parseDateOnly, toDateInputValue } from "@/lib/utils";
import type { WorkTask } from "@/components/modules/dia/WorkTasksToday";
import type { ProductionExtras, ProductionPeekData } from "@/lib/production-peek";
import { ClientOptions } from "./ClientOptions";
import { INTERNAL_CLIENT } from "./ContentPostModal";

/** Grava no servidor e reflete na tela de quem abriu o painel. */
export type SaveTask = (task: WorkTask, local: Partial<WorkTask>, body: object) => unknown;

/** Busca o que o painel precisa de uma tarefa de produção. */
export async function fetchProductionPeek(taskId: string) {
  return api.get<ProductionPeekData>(`/api/ace/tasks/${taskId}`);
}

/**
 * Tipo, cliente e afins só existem na tarefa de produção. No Dia o painel já
 * tem a tarefa; isto completa com o que falta, buscando uma vez ao abrir.
 */
export function useProductionExtras(task: WorkTask, initial?: ProductionExtras) {
  const [extras, setExtras] = useState<ProductionExtras | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const isProduction = task.kind === "production";

  useEffect(() => {
    if (!isProduction || initial) return;
    let cancelled = false;
    fetchProductionPeek(task.id)
      .then((data) => {
        if (!cancelled) setExtras(data.production);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [isProduction, task.id, initial]);

  return { extras: isProduction ? extras : null, setExtras, error };
}

const selectClass =
  "min-w-0 max-w-full cursor-pointer truncate rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-text-primary outline-none hover:border-border focus:border-border focus:ring-2 focus:ring-accent";

/** Linha "rótulo | valor" no mesmo desenho das outras propriedades do painel. */
type PropertyRow = (props: { label: string; children: ReactNode }) => ReactNode;

/**
 * As propriedades a mais da tarefa de produção. Cada troca grava na hora, como
 * todo o resto do painel.
 */
export function ProductionProperties({
  task,
  extras,
  Property,
  onExtras,
  onSave,
}: {
  task: WorkTask;
  extras: ProductionExtras;
  Property: PropertyRow;
  onExtras: (next: ProductionExtras) => void;
  onSave: SaveTask;
}) {
  const [error, setError] = useState<string | null>(null);

  async function change(patch: Partial<ProductionExtras>, local: Partial<WorkTask>, body: object) {
    const previous = extras;
    setError(null);
    onExtras({ ...extras, ...patch });
    try {
      await onSave(task, local, body);
    } catch (e) {
      onExtras(previous);
      setError(errorMessage(e));
    }
  }

  // A linha cinza sob o título no Dia: "Reels · Cliente".
  const detailFor = (type: string, clientId: string | null) =>
    [
      productionTypeLabels[type],
      extras.clients.find((c) => c.id === clientId)?.name ?? "Interno",
    ].join(" · ");

  return (
    <>
      <Property label="Tipo">
        <select
          value={extras.type}
          onChange={(e) =>
            change(
              { type: e.target.value },
              { detail: detailFor(e.target.value, extras.clientId) },
              { type: e.target.value },
            )
          }
          aria-label="Tipo"
          className={selectClass}
        >
          {Object.keys(productionTypeLabels).map((t) => (
            <option key={t} value={t}>
              {productionTypeLabels[t]}
            </option>
          ))}
        </select>
      </Property>
      <Property label="Cliente">
        <select
          value={extras.clientId ?? INTERNAL_CLIENT}
          onChange={(e) => {
            const clientId = e.target.value || null;
            change({ clientId }, { detail: detailFor(extras.type, clientId) }, { clientId });
          }}
          aria-label="Cliente"
          className={selectClass}
        >
          <option value={INTERNAL_CLIENT}>Interno do negócio</option>
          <ClientOptions clients={extras.clients} />
        </select>
      </Property>
      <Property label="No Kanban">
        <select
          // Marcar o círculo do título também conclui/reabre: a coluna segue
          // o que está na tela, sem esperar buscar a tarefa de novo.
          value={
            task.done ? "CONCLUIDO" : extras.status === "CONCLUIDO" ? "A_FAZER" : extras.status
          }
          onChange={(e) => {
            const status = e.target.value;
            const done = status === "CONCLUIDO";
            change(
              { status },
              {
                done,
                completedAt: done ? (task.completedAt ?? new Date().toISOString()) : null,
                missed: status === "PRAZO_PERDIDO",
              },
              { status },
            );
          }}
          aria-label="Coluna no Kanban"
          className={selectClass}
        >
          {/* Prazo perdido é gravado pelo sistema; só aparece quando já é o status. */}
          {Object.keys(productionStatusLabels)
            .filter((s) => s !== "PRAZO_PERDIDO" || extras.status === s)
            .map((s) => (
              <option key={s} value={s}>
                {productionStatusLabels[s]}
              </option>
            ))}
        </select>
      </Property>
      <Property label="Urgência">
        <select
          value={extras.priority}
          onChange={(e) => {
            const priority = e.target.value;
            change({ priority }, { urgent: !task.done && priority === "URGENTE" }, { priority });
          }}
          aria-label="Urgência"
          className={cn(selectClass, extras.priority === "URGENTE" && "font-medium text-danger")}
        >
          {Object.keys(priorityLabels).map((p) => (
            <option key={p} value={p}>
              {priorityLabels[p]}
            </option>
          ))}
        </select>
      </Property>
      {error && <p className="text-xs text-danger">{error}</p>}
    </>
  );
}

/** Texto puro quando o passo não tem etapa: é o que a API já aceitava. */
function stepsPayload(steps: { title: string; stage?: string | null }[]) {
  return steps.map((s) => (s.stage ? { title: s.title, stage: s.stage } : s.title));
}

/** Duplicar para a semana seguinte e excluir — o que o modal antigo fazia. */
export function ProductionActions({
  task,
  extras,
  steps,
  onRemoved,
  onClose,
}: {
  task: WorkTask;
  extras: ProductionExtras;
  steps: { title: string; stage?: string | null }[];
  onRemoved?: (task: WorkTask) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Copia a tarefa para a semana seguinte — útil pra produção recorrente
  // (ex.: "edição do reels toda semana") sem preencher tudo de novo.
  async function duplicate() {
    setBusy(true);
    setError(null);
    const due = task.dueDate ? parseDateOnly(toDateInputValue(task.dueDate)) : null;
    const nextDate = due ? toDateInputValue(addUtcDays(due, 7)) : null;
    try {
      await api.post("/api/ace/tasks", {
        title: task.title,
        type: extras.type,
        description: task.description ?? null,
        priority: extras.priority,
        priorityLevelId: task.priorityLevelId,
        estimateMinutes: task.estimateMinutes,
        status: "A_FAZER",
        dueDate: nextDate,
        notes: task.notes ?? null,
        businessId: task.businessId,
        clientId: extras.clientId,
        projectId: task.project?.id ?? null,
        // A cópia leva os passos, todos por fazer.
        steps: stepsPayload(steps),
      });
      router.refresh();
      notify(
        nextDate
          ? `Duplicado para ${formatDateBR(new Date(`${nextDate}T00:00:00Z`))}.`
          : "Duplicado.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const confirmed = await confirmAction({
      title: "Excluir esta tarefa de produção?",
      description: `"${task.title}" e os passos dela saem de todas as telas.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/api/ace/tasks/${task.id}`);
      onRemoved?.(task);
      router.refresh();
      notify("Excluído.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={duplicate} disabled={busy}>
          <Copy size={14} />
          Duplicar para a próxima semana
        </Button>
        <Button
          variant="ghost"
          onClick={remove}
          disabled={busy}
          className="text-danger hover:bg-danger-soft-bg"
        >
          <Trash2 size={14} />
          Excluir
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
