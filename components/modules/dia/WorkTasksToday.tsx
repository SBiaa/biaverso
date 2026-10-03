"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Circle, Clock } from "lucide-react";
import { AttentionBadge, Card, CardTitle, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatDateBR, hexToRgba } from "@/lib/utils";
import {
  formatMinutes,
  parseMinutes,
  type PriorityLevelDTO,
} from "@/lib/task-plan";
import {
  SubtaskList,
  SubtaskToggle,
  useSubtasks,
  type SubtaskItem,
} from "@/components/modules/tarefas/Subtasks";

export type WorkTask = {
  /** `production` ou `collection`: decide para qual rota o PATCH vai. */
  kind: "production" | "collection";
  id: string;
  title: string;
  done: boolean;
  /** Chip de origem: o negócio (produção) ou a coleção. */
  originLabel: string;
  originColor: string;
  originHref: string | null;
  /** Linha cinza sob o título: tipo e cliente, quando houver. */
  detail: string | null;
  urgent: boolean;
  priorityLevelId: string | null;
  estimateMinutes: number | null;
  dueDate: string | null;
  overdue: boolean;
  /** Só tarefa de coleção precisa do id da coleção na rota. */
  collectionId: string | null;
  subtasks: SubtaskItem[];
};

type Patch = { priorityLevelId?: string | null; estimateMinutes?: number | null };

function patchUrl(task: WorkTask) {
  return task.kind === "production"
    ? `/api/ace/tasks/${task.id}`
    : `/api/collections/${task.collectionId}/tasks/${task.id}`;
}

function EstimateInput({
  minutes,
  disabled,
  onCommit,
}: {
  minutes: number | null;
  disabled: boolean;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(minutes === null ? "" : formatMinutes(minutes));
  const [invalid, setInvalid] = useState(false);

  function commit() {
    const parsed = parseMinutes(text);
    if (parsed === undefined) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setText(parsed === null ? "" : formatMinutes(parsed));
    if (parsed !== minutes) onCommit(parsed);
  }

  return (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        setInvalid(false);
      }}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      disabled={disabled}
      placeholder="—"
      aria-label="Tempo estimado"
      aria-invalid={invalid}
      title='Ex.: 45, 1h30, 2h'
      className={cn(
        "w-16 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-text-primary outline-none placeholder:text-text-secondary/60 hover:border-border focus:border-border focus:ring-2 focus:ring-accent disabled:opacity-50",
        invalid && "border-red-500",
      )}
    />
  );
}

function PrioritySelect({
  task,
  levels,
  onChange,
}: {
  task: WorkTask;
  levels: PriorityLevelDTO[];
  onChange: (id: string | null) => void;
}) {
  const level = levels.find((l) => l.id === task.priorityLevelId);

  return (
    <select
      value={task.priorityLevelId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={task.done}
      aria-label="Prioridade"
      className="max-w-[7rem] cursor-pointer rounded-full border border-transparent py-0.5 pl-2 pr-1 text-xs font-medium outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      style={
        level
          ? { backgroundColor: hexToRgba(level.color, 0.14), color: level.color }
          : undefined
      }
    >
      <option value="">Sem prioridade</option>
      {levels.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  );
}

function TaskRow({
  task,
  levels,
  onToggle,
  onPatch,
}: {
  task: WorkTask;
  levels: PriorityLevelDTO[];
  onToggle: (task: WorkTask) => void;
  onPatch: (task: WorkTask, patch: Patch) => void;
}) {
  const subtasks = useSubtasks({ kind: task.kind, id: task.id }, task.subtasks);
  // Tarefa já quebrada nasce aberta: o ponto dos passos é ver por onde começar.
  const [open, setOpen] = useState(task.subtasks.length > 0 && !task.done);
  const late = task.overdue && !task.done;

  return (
    <>
      <tr>
        <td className="py-2 pr-3 align-top">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => onToggle(task)}
              className="mt-0.5 shrink-0"
              aria-label={task.done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
            >
              {task.done ? (
                <CheckCircle2 size={16} className="text-accent" />
              ) : (
                <Circle size={16} className="text-text-secondary" />
              )}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {task.urgent && !task.done && (
                  <AlertTriangle size={14} className="shrink-0 text-red-600" />
                )}
                <span
                  className={cn(
                    "text-text-primary",
                    task.done && "text-text-secondary line-through",
                  )}
                >
                  {task.title}
                  {task.urgent && <span className="sr-only"> (urgente)</span>}
                </span>
                <SubtaskToggle
                  open={open}
                  onClick={() => setOpen((v) => !v)}
                  doneCount={subtasks.doneCount}
                  total={subtasks.subtasks.length}
                />
              </div>
              {task.detail && (
                <p className="text-xs text-text-secondary">{task.detail}</p>
              )}
            </div>
          </div>
        </td>
        <td className="py-2 pr-3 align-top">
          <PrioritySelect
            task={task}
            levels={levels}
            onChange={(priorityLevelId) => onPatch(task, { priorityLevelId })}
          />
        </td>
        <td className="py-2 pr-3 align-top">
          <EstimateInput
            // Remonta se o valor voltar do servidor diferente (erro de gravação).
            key={task.estimateMinutes ?? "none"}
            minutes={task.estimateMinutes}
            disabled={task.done}
            onCommit={(estimateMinutes) => onPatch(task, { estimateMinutes })}
          />
        </td>
        <td className="py-2 pr-3 align-top">
          {task.originHref ? (
            <Link
              href={task.originHref}
              className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium hover:underline"
              style={{
                backgroundColor: hexToRgba(task.originColor, 0.12),
                color: task.originColor,
              }}
            >
              {task.originLabel}
            </Link>
          ) : (
            <span
              className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: hexToRgba(task.originColor, 0.12),
                color: task.originColor,
              }}
            >
              {task.originLabel}
            </span>
          )}
        </td>
        <td className="whitespace-nowrap py-2 align-top">
          {task.dueDate ? (
            <span className={cn("text-text-secondary", late && "font-medium text-red-600")}>
              {formatDateBR(new Date(task.dueDate))}
            </span>
          ) : (
            <span className="text-text-secondary/60">Sem prazo</span>
          )}
          {late && (
            <AttentionBadge level="atrasado" className="ml-1.5">
              Atrasado
            </AttentionBadge>
          )}
        </td>
      </tr>
      {open && (
        // `divide-y` do tbody separaria a tarefa dos próprios passos.
        <tr className="border-t-0">
          <td colSpan={5} className="pb-3 pl-6">
            <SubtaskList {...subtasks} />
          </td>
        </tr>
      )}
    </>
  );
}

/** Ordem da tabela: prioridade (a mais urgente primeiro), depois prazo. */
function sortTasks(tasks: WorkTask[], levels: PriorityLevelDTO[]) {
  const rank = new Map(levels.map((l) => [l.id, l.order]));
  const none = Number.MAX_SAFE_INTEGER;
  const time = (t: WorkTask) => (t.dueDate ? new Date(t.dueDate).getTime() : none);

  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const byPriority =
      (a.priorityLevelId ? (rank.get(a.priorityLevelId) ?? none) : none) -
      (b.priorityLevelId ? (rank.get(b.priorityLevelId) ?? none) : none);
    if (byPriority !== 0) return byPriority;
    // Urgente antigo (campo da produção) só desempata quando o nível é igual.
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    const byDue = time(a) - time(b);
    if (byDue !== 0) return byDue;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

/**
 * Tudo o que está em andamento nos negócios e nas coleções, numa tabela só:
 * prioridade, tempo estimado, origem e prazo. É a tabela do Notion antigo —
 * dá para olhar e decidir o que fazer primeiro, e quanto tempo o dia pede.
 */
export function WorkTasksToday({
  tasks,
  levels,
}: {
  tasks: WorkTask[];
  levels: PriorityLevelDTO[];
}) {
  const [items, setItems] = useState(tasks);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => sortTasks(items, levels), [items, levels]);
  const open = items.filter((t) => !t.done);
  const lateCount = open.filter((t) => t.overdue).length;
  const estimated = open.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0);
  const withoutEstimate = open.filter((t) => t.estimateMinutes === null).length;

  function update(key: string, change: Partial<WorkTask>) {
    setItems((prev) =>
      prev.map((t) => (t.kind + t.id === key ? { ...t, ...change } : t)),
    );
  }

  async function save(task: WorkTask, change: Partial<WorkTask>, body: object) {
    const previous = items;
    const key = task.kind + task.id;

    setError(null);
    update(key, change);

    try {
      await api.patch(patchUrl(task), body);
    } catch (e) {
      setItems(previous);
      setError(errorMessage(e));
    }
  }

  function toggle(task: WorkTask) {
    const done = !task.done;
    // Produção guarda status; coleção guarda um booleano.
    const body =
      task.kind === "production"
        ? { status: done ? "CONCLUIDO" : "A_FAZER" }
        : { done };
    return save(task, { done }, body);
  }

  function patch(task: WorkTask, change: Patch) {
    return save(task, change, change);
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardTitle className="mb-3">Tarefas em andamento</CardTitle>
        <p className="text-sm text-text-secondary">
          Nenhuma tarefa em aberto nos negócios ou nas coleções.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <CardTitle>Tarefas em andamento</CardTitle>
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-text-secondary">
          <span>
            {open.length} {open.length === 1 ? "aberta" : "abertas"}
          </span>
          {lateCount > 0 && (
            <span className="font-medium text-red-600">
              {lateCount} {lateCount === 1 ? "atrasada" : "atrasadas"}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {estimated > 0 ? `~${formatMinutes(estimated)}` : "sem estimativa"}
            {estimated > 0 && withoutEstimate > 0 && (
              <span> · {withoutEstimate} sem tempo</span>
            )}
          </span>
        </p>
      </div>

      {/* Colunas não cabem numa tela de celular: a tabela rola na horizontal
          em vez de espremer o título até virar duas letras por linha. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[38rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-text-secondary">
              <th scope="col" className="pb-2 pr-3 font-medium">
                Tarefa
              </th>
              <th scope="col" className="pb-2 pr-3 font-medium">
                Prioridade
              </th>
              <th scope="col" className="pb-2 pr-3 font-medium">
                Tempo
              </th>
              <th scope="col" className="pb-2 pr-3 font-medium">
                Origem
              </th>
              <th scope="col" className="pb-2 font-medium">
                Prazo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((task) => (
              <TaskRow
                key={task.kind + task.id}
                task={task}
                levels={levels}
                onToggle={toggle}
                onPatch={patch}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ErrorNote message={error} />
    </Card>
  );
}
