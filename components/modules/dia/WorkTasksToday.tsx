"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Circle, Clock } from "lucide-react";
import { AttentionBadge, Card, CardTitle, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatDateBR, hexToRgba } from "@/lib/utils";
import { focusKey } from "@/lib/day-focus";
import { FocusStar } from "@/components/modules/dia/FocusStar";
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
  /** `production`, `collection` ou `prospect`: decide para qual rota o PATCH vai. */
  kind: "production" | "collection" | "prospect";
  id: string;
  title: string;
  done: boolean;
  /** Já veio concluída do servidor (aba "Feitas"), e não marcada agora na tela. */
  doneOnLoad: boolean;
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
  /** Quando foi concluída; só existe para tarefa feita. */
  completedAt: string | null;
  overdue: boolean;
  /** Só tarefa de coleção precisa do id da coleção na rota. */
  collectionId: string | null;
  subtasks: SubtaskItem[];
};

/** Em "Feitas": por quando foi concluída, ou pelo dia em que estava marcada. */
type DoneBy = "completed" | "due";

type Range = "today" | "tomorrow" | "week" | "all" | "done";

const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "tomorrow", label: "Amanhã" },
  { id: "week", label: "Semana" },
  { id: "all", label: "Tudo" },
  { id: "done", label: "Feitas" },
];

type Patch = { priorityLevelId?: string | null; estimateMinutes?: number | null };

function patchUrl(task: WorkTask) {
  if (task.kind === "prospect") return `/api/prospect-tasks/${task.id}`;
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
  dayId,
  focused,
  levels,
  showCompleted,
  onToggle,
  onPatch,
}: {
  task: WorkTask;
  dayId: string;
  focused: boolean;
  levels: PriorityLevelDTO[];
  /** Mostra a data de conclusão no lugar do prazo. */
  showCompleted: boolean;
  onToggle: (task: WorkTask) => void;
  onPatch: (task: WorkTask, patch: Patch) => void;
}) {
  // Passo de prospecção não tem subtarefas: o próprio checklist já é a quebra.
  const subtasks = useSubtasks(
    { kind: task.kind === "prospect" ? "task" : task.kind, id: task.id },
    task.subtasks,
  );
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
                <FocusStar
                  dayId={dayId}
                  kind={task.kind}
                  taskId={task.id}
                  focused={focused}
                  title={task.title}
                />
                {task.kind !== "prospect" && (
                  <SubtaskToggle
                    open={open}
                    onClick={() => setOpen((v) => !v)}
                    doneCount={subtasks.doneCount}
                    total={subtasks.subtasks.length}
                  />
                )}
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
          {(showCompleted ? task.completedAt : task.dueDate) ? (
            <span className={cn("text-text-secondary", late && "font-medium text-red-600")}>
              {formatDateBR(new Date((showCompleted ? task.completedAt : task.dueDate)!))}
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
      {open && task.kind !== "prospect" && (
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
 * Tudo o que está em andamento nos negócios, nas coleções e na prospecção, numa tabela só:
 * prioridade, tempo estimado, origem e prazo. É a tabela do Notion antigo —
 * dá para olhar e decidir o que fazer primeiro, e quanto tempo o dia pede.
 */
export function WorkTasksToday({
  dayId,
  focusKeys,
  tasks,
  levels,
  dayEnd,
  weekEnd,
}: {
  dayId: string;
  /** `kind:id` das tarefas que estão no foco do dia. */
  focusKeys: string[];
  tasks: WorkTask[];
  levels: PriorityLevelDTO[];
  /** Fim (exclusivo) do dia em foco e da semana dele, em ISO. */
  dayEnd: string;
  weekEnd: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [range, setRange] = useState<Range>("all");
  const [doneBy, setDoneBy] = useState<DoneBy>("completed");
  const [error, setError] = useState<string | null>(null);

  // Atrasada entra em Hoje e em Semana: o que venceu antes continua à vista.
  // Sem prazo só aparece em "Tudo" — não dá para dizer que é da semana.
  const limits = { day: new Date(dayEnd).getTime(), week: new Date(weekEnd).getTime() };
  // Amanhã é só o que vence no dia seguinte: o atrasado continua em Hoje.
  const tomorrowEnd = limits.day + 24 * 60 * 60 * 1000;
  const inRange = (t: WorkTask, r: Range) => {
    // "Feitas" é tudo que está concluído; as outras abas escondem o que já
    // chegou concluído, mas mantêm o que ela acabou de marcar (riscado, no fim).
    if (r === "done") {
      if (!t.done) return false;
      const when = doneBy === "completed" ? t.completedAt : t.dueDate;
      if (!when) return false;
      const time = new Date(when).getTime();
      return time >= limits.day - 24 * 60 * 60 * 1000 && time < limits.day;
    }
    if (t.done && t.doneOnLoad) return false;
    if (r === "all") return true;
    if (t.dueDate === null) return false;
    const due = new Date(t.dueDate).getTime();
    if (r === "tomorrow") return due >= limits.day && due < tomorrowEnd;
    return due < limits[r === "today" ? "day" : "week"];
  };

  const visible = useMemo(
    () => sortTasks(items.filter((t) => inRange(t, range)), levels),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, levels, range, doneBy, dayEnd, weekEnd],
  );
  const open = visible.filter((t) => !t.done);
  const lateCount = open.filter((t) => t.overdue).length;
  const estimated = open.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0);
  const withoutEstimate = open.filter((t) => t.estimateMinutes === null).length;
  // Em "Feitas" o que conta é o concluído; nas outras, o que ainda está aberto.
  const openIn = (r: Range) =>
    items.filter((t) => (r === "done" ? t.done : !t.done) && inRange(t, r));
  const countOpen = (r: Range) => openIn(r).length;
  const doneCount = countOpen("done");

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
      // O foco do dia, no topo, vem do servidor.
      router.refresh();
    } catch (e) {
      setItems(previous);
      setError(errorMessage(e));
    }
  }

  function toggle(task: WorkTask) {
    const done = !task.done;
    // Produção guarda status; coleção e prospecção guardam um booleano.
    const body =
      task.kind === "production"
        ? { status: done ? "CONCLUIDO" : "A_FAZER" }
        : { done };
    return save(task, { done, completedAt: done ? new Date().toISOString() : null }, body);
  }

  function patch(task: WorkTask, change: Patch) {
    return save(task, change, change);
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardTitle className="mb-3">Tarefas em andamento</CardTitle>
        <p className="text-sm text-text-secondary">
          Nenhuma tarefa em aberto nos negócios, nas coleções ou na prospecção.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <CardTitle>Tarefas em andamento</CardTitle>
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-text-secondary">
          {range === "done" ? (
            <span>
              {doneCount} {doneCount === 1 ? "feita" : "feitas"} no dia
            </span>
          ) : (
            <span>
              {open.length} {open.length === 1 ? "aberta" : "abertas"}
            </span>
          )}
          {range !== "done" && (
            <>
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
            </>
          )}
        </p>
      </div>

      <div className="mb-3 flex gap-1.5" role="group" aria-label="Período">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            aria-pressed={range === r.id}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              range === r.id
                ? "border-accent bg-accent text-accent-contrast"
                : "border-border text-text-secondary hover:text-text-primary",
            )}
          >
            {r.label} · {countOpen(r.id)}
          </button>
        ))}
      </div>

      {range === "done" && (
        <div className="mb-3 flex items-center gap-2 text-xs text-text-secondary">
          <span>Data:</span>
          <select
            value={doneBy}
            onChange={(e) => setDoneBy(e.target.value as DoneBy)}
            aria-label="Data usada em Feitas"
            className="cursor-pointer rounded-md border border-border bg-transparent px-2 py-1 text-xs text-text-primary outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="completed">Finalização (quando concluí)</option>
            <option value="due">Execução (dia marcado)</option>
          </select>
        </div>
      )}

      {visible.length === 0 && (
        <p className="py-2 text-sm text-text-secondary">
          {range === "done"
            ? "Nada concluído neste dia."
            : range === "tomorrow"
              ? "Nada com prazo para amanhã."
              : `Nada com prazo ${range === "today" ? "até hoje" : "até o fim da semana"}.`}
        </p>
      )}

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
                {range === "done" && doneBy === "completed" ? "Concluída em" : "Prazo"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((task) => (
              <TaskRow
                key={task.kind + task.id}
                task={task}
                dayId={dayId}
                focused={focusKeys.includes(focusKey(task.kind, task.id))}
                levels={levels}
                showCompleted={range === "done" && doneBy === "completed"}
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
