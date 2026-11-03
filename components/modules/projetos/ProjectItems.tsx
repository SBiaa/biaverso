"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, FileText, ListTodo, Plus, Table2 } from "lucide-react";
import { AttentionBadge, Button, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatDateBR, toDateInputValue, todayInputValue } from "@/lib/utils";
import {
  contentStatusLabels,
  postTypeLabels,
  productionStatusLabels,
  productionTypeLabels,
} from "@/lib/labels";
import {
  contentStatusColors,
  donePostStatuses,
  doneTaskStatuses,
  productionStatusColors,
} from "@/lib/ace-shared";
import {
  ContentPostModal,
  INTERNAL_CLIENT,
  type ClientOption,
  type ProjectOption,
  type PostRecord,
} from "@/components/modules/ace/ContentPostModal";
import {
  ProductionTaskModal,
  type TaskRecord,
} from "@/components/modules/ace/ProductionTaskModal";
import { ProjectCalendar, type ProjectItem } from "./ProjectCalendar";

type View = "tabela" | "calendario";
type Filter = "tudo" | "task" | "post";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "tudo", label: "Tudo" },
  { id: "task", label: "Tarefas" },
  { id: "post", label: "Posts" },
];

/** A partir de quantos dias de atraso o item vai para o bloco recolhido. */
const OLD_LATE_DAYS = 30;

const dayOf =(iso: string | null) => (iso ? toDateInputValue(iso) : null);

/** O que muda numa linha editada direto na tabela, antes do servidor confirmar. */
type ItemEdit = Partial<ProjectItem> & { rawStatus?: string };

/** Mês que a tela abre: o de hoje se o projeto está rolando, senão o do começo dele. */
function pickInitialMonth(
  today: string,
  startDate: string | null,
  endDate: string | null,
  items: ProjectItem[],
) {
  const inside = (!startDate || today >= startDate) && (!endDate || today <= endDate);
  const firstItem = items.map((i) => i.date).filter((d): d is string => !!d).sort()[0];
  const base = inside ? today : (startDate ?? firstItem ?? today);
  return { year: Number(base.slice(0, 4)), month: Number(base.slice(5, 7)) };
}

/** Posts e tarefas de produção do projeto, em tabela ou calendário, com criação e edição. */
export function ProjectItems({
  businessId,
  projectId,
  clientId,
  startDate = null,
  endDate = null,
  posts,
  tasks,
  clients,
  projectOptions,
}: {
  businessId: string;
  /** Ausente na visão do negócio inteiro: o modal escolhe o projeto. */
  projectId?: string;
  /** Null = projeto interno do negócio; ausente = visão do negócio inteiro. */
  clientId?: string | null;
  /** "YYYY-MM-DD" ou null. */
  startDate?: string | null;
  endDate?: string | null;
  posts: PostRecord[];
  tasks: TaskRecord[];
  clients: ClientOption[];
  projectOptions: ProjectOption[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("tabela");
  const [filter, setFilter] = useState<Filter>("tudo");
  const [creating, setCreating] = useState<{
    kind: "post" | "task";
    date: string | null;
  } | null>(null);
  const [editingPost, setEditingPost] = useState<PostRecord | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);

  const defaultClientId =
    clientId === undefined ? undefined : (clientId ?? INTERNAL_CLIENT);
  const today = todayInputValue();

  // Mesma referência enquanto o servidor não manda dados novos: o calendário
  // usa isso para saber quando descartar a cópia local.
  const items = useMemo<ProjectItem[]>(() => {
    const fromTasks = tasks.map<ProjectItem>((t) => ({
      key: `task-${t.id}`,
      kind: "task",
      id: t.id,
      title: t.title,
      typeLabel: productionTypeLabels[t.type] ?? t.type,
      statusLabel: productionStatusLabels[t.status] ?? t.status,
      statusColor: productionStatusColors[t.status] ?? "",
      date: dayOf(t.dueDate),
      finishedOn: dayOf(t.completedAt),
      done: (doneTaskStatuses as string[]).includes(t.status),
      missed: t.status === "PRAZO_PERDIDO",
      steps:
        t.subtasks.length > 0
          ? { done: t.subtasks.filter((s) => s.done).length, total: t.subtasks.length }
          : undefined,
    }));
    const fromPosts = posts.map<ProjectItem>((p) => ({
      key: `post-${p.id}`,
      kind: "post",
      id: p.id,
      title: p.title,
      typeLabel: postTypeLabels[p.type] ?? p.type,
      statusLabel: contentStatusLabels[p.status] ?? p.status,
      statusColor: contentStatusColors[p.status] ?? "",
      date: dayOf(p.publishDate),
      finishedOn: dayOf(p.completedAt),
      done: (donePostStatuses as string[]).includes(p.status),
      missed: p.status === "PRAZO_PERDIDO",
    }));
    return [...fromTasks, ...fromPosts];
  }, [posts, tasks]);

  // Edições feitas direto na tabela aparecem na hora; quando o servidor manda a
  // lista nova (outra referência de `items`), as sobreposições somem sozinhas.
  const [edits, setEdits] = useState<{
    base: ProjectItem[];
    byKey: Record<string, ItemEdit>;
  }>({ base: items, byKey: {} });
  const liveEdits = edits.base === items ? edits.byKey : null;
  const shownItems = useMemo(
    () =>
      liveEdits
        ? items.map((i) => (liveEdits[i.key] ? { ...i, ...liveEdits[i.key] } : i))
        : items,
    [items, liveEdits],
  );

  const initialMonth = useMemo(
    () => pickInitialMonth(today, startDate, endDate, items),
    // Só a primeira vez: depois o calendário guarda o mês que a pessoa navegou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [showOldLate, setShowOldLate] = useState(false);
  const [showDone, setShowDone] = useState(false);

  // A tabela em blocos: o que atrasou há pouco vem primeiro (o mais recente no
  // topo), depois o que vence, e o que atrasou há mais de 30 dias e o que já
  // foi feito ficam recolhidos — senão meses de atraso enterram o que importa.
  const sections = useMemo(() => {
    const cutoff = new Date(`${today}T00:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - OLD_LATE_DAYS);
    const cutoffDay = cutoff.toISOString().slice(0, 10);

    const byTitle = (a: ProjectItem, b: ProjectItem) => a.title.localeCompare(b.title, "pt-BR");
    const asc = (a: ProjectItem, b: ProjectItem) =>
      a.date === b.date ? byTitle(a, b) : (a.date ?? "") < (b.date ?? "") ? -1 : 1;
    const desc = (a: ProjectItem, b: ProjectItem) => (a.date === b.date ? byTitle(a, b) : -asc(a, b));

    const visible = shownItems.filter((i) => filter === "tudo" || i.kind === filter);
    const pending = visible.filter((i) => !i.done);

    return {
      recentLate: pending.filter((i) => i.date && i.date < today && i.date >= cutoffDay).sort(desc),
      upcoming: pending.filter((i) => i.date && i.date >= today).sort(asc),
      noDate: pending.filter((i) => !i.date).sort(byTitle),
      oldLate: pending.filter((i) => i.date && i.date < cutoffDay).sort(desc),
      done: visible
        .filter((i) => i.done)
        .sort((a, b) => {
          const da = a.finishedOn ?? a.date ?? "";
          const db = b.finishedOn ?? b.date ?? "";
          return da === db ? byTitle(a, b) : da < db ? 1 : -1;
        }),
    };
  }, [shownItems, filter, today]);

  const rowCount = Object.values(sections).reduce((n, s) => n + s.length, 0);

  const count = (f: Filter) => shownItems.filter((i) => f === "tudo" || i.kind === f).length;
  const openCount = shownItems.filter((i) => !i.done).length;
  const doneCount = shownItems.length - openCount;
  const lateCount = shownItems.filter(
    (i) => !i.done && !i.missed && i.date && i.date < today,
  ).length;
  const missedCount = shownItems.filter((i) => !i.done && i.missed).length;

  function rawStatus(item: ProjectItem) {
    const edited = liveEdits?.[item.key]?.rawStatus;
    if (edited) return edited;
    return item.kind === "post"
      ? (posts.find((p) => p.id === item.id)?.status ?? "")
      : (tasks.find((t) => t.id === item.id)?.status ?? "");
  }

  /** Grava um campo direto da tabela: mostra na hora e desfaz se o servidor recusar. */
  async function quickSave(
    item: ProjectItem,
    body: Record<string, unknown>,
    preview: ItemEdit,
  ) {
    const before = liveEdits ?? {};
    setEdits({
      base: items,
      byKey: { ...before, [item.key]: { ...before[item.key], ...preview } },
    });
    try {
      await api.patch(
        item.kind === "post" ? `/api/ace/posts/${item.id}` : `/api/ace/tasks/${item.id}`,
        body,
      );
      router.refresh();
    } catch (e) {
      setEdits({ base: items, byKey: before });
      notify(errorMessage(e), "error");
    }
  }

  function changeStatus(item: ProjectItem, status: string) {
    const isPost = item.kind === "post";
    const done = ((isPost ? donePostStatuses : doneTaskStatuses) as string[]).includes(status);
    void quickSave(
      item,
      { status },
      {
        rawStatus: status,
        statusLabel: (isPost ? contentStatusLabels : productionStatusLabels)[status] ?? status,
        statusColor: (isPost ? contentStatusColors : productionStatusColors)[status] ?? "",
        done,
        missed: status === "PRAZO_PERDIDO",
        // O servidor marca a finalização como hoje quando conclui sem data.
        finishedOn: done && !item.finishedOn ? today : item.finishedOn,
      },
    );
  }

  function changeDate(item: ProjectItem, date: string | null) {
    void quickSave(
      item,
      item.kind === "post" ? { publishDate: date } : { dueDate: date },
      { date },
    );
  }

  function changeFinished(item: ProjectItem, date: string | null) {
    void quickSave(item, { completedAt: date }, { finishedOn: date });
  }

  function open(item: ProjectItem) {
    if (item.kind === "post") {
      setEditingPost(posts.find((p) => p.id === item.id) ?? null);
    } else {
      setEditingTask(tasks.find((t) => t.id === item.id) ?? null);
    }
  }

  function renderRow(item: ProjectItem) {
    const late = !item.done && !item.missed && item.date !== null && item.date < today;
    const Icon = item.kind === "post" ? FileText : ListTodo;
    return (
      <tr
        key={item.key}
        onClick={() => open(item)}
        className="cursor-pointer hover:bg-hover"
      >
        <td className="py-2 pr-3 align-top">
          <span className="flex items-start gap-2">
            <Icon size={14} className="mt-0.5 shrink-0 text-text-secondary" />
            <span
              className={cn(
                "text-text-primary",
                item.done && "text-text-secondary line-through",
              )}
            >
              {item.title}
            </span>
            {item.steps && (
              <span
                title="Passos feitos"
                className={cn(
                  "mt-px shrink-0 text-xs tabular-nums text-text-secondary",
                  item.steps.done === item.steps.total && "text-accent",
                )}
              >
                {item.steps.done}/{item.steps.total}
              </span>
            )}
          </span>
        </td>
        <td className="whitespace-nowrap py-2 pr-3 align-top text-text-secondary">
          {item.typeLabel}
        </td>
        <td className="py-2 pr-3 align-top" onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            item={item}
            current={rawStatus(item)}
            onChange={(status) => changeStatus(item, status)}
          />
        </td>
        <td
          className="whitespace-nowrap py-2 pr-3 align-top"
          onClick={(e) => e.stopPropagation()}
        >
          <DateCell
            value={item.date}
            emptyLabel="Sem data"
            label={item.kind === "post" ? "Data de publicação" : "Prazo"}
            className={cn(late && "font-medium text-red-600")}
            onSave={(date) => changeDate(item, date)}
          />
          {late && (
            <AttentionBadge level="atrasado" className="ml-1.5">
              Atrasado
            </AttentionBadge>
          )}
        </td>
        <td className="whitespace-nowrap py-2 align-top" onClick={(e) => e.stopPropagation()}>
          <DateCell
            value={item.finishedOn}
            emptyLabel="—"
            label="Data de finalização"
            onSave={(date) => changeFinished(item, date)}
          />
        </td>
      </tr>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex gap-1.5" role="group" aria-label="Filtrar">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.id
                    ? "border-accent bg-accent text-accent-contrast"
                    : "border-border text-text-secondary hover:text-text-primary",
                )}
              >
                {f.label} · {count(f.id)}
              </button>
            ))}
          </div>
          <p className="flex items-center gap-x-3 text-xs text-text-secondary">
            <span>
              {doneCount} {doneCount === 1 ? "concluído" : "concluídos"} · {openCount}{" "}
              {openCount === 1 ? "aberto" : "abertos"}
            </span>
            {lateCount > 0 && (
              <span className="font-medium text-red-600">
                {lateCount} {lateCount === 1 ? "atrasado" : "atrasados"}
              </span>
            )}
            {missedCount > 0 && (
              <span className="text-text-secondary">{missedCount} com prazo perdido</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-border">
            {(
              [
                { id: "tabela", label: "Tabela", icon: Table2 },
                { id: "calendario", label: "Calendário", icon: CalendarDays },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                aria-pressed={view === id}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium",
                  view === id
                    ? "bg-accent text-accent-contrast"
                    : "text-text-secondary hover:bg-hover",
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCreating({ kind: "task", date: null })}
          >
            <Plus size={14} />
            Nova tarefa
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCreating({ kind: "post", date: null })}
          >
            <Plus size={14} />
            Novo post
          </Button>
        </div>
      </div>

      {view === "tabela" ? (
        rowCount === 0 ? (
          <p className="py-2 text-sm text-text-secondary">
            {items.length === 0
              ? projectId
              ? "Nenhuma tarefa ou post neste projeto ainda."
              : "Nenhuma tarefa ou post neste negócio ainda."
              : "Nada nesse filtro."}
          </p>
        ) : (
          // Colunas não cabem no celular: a tabela rola na horizontal em vez de
          // espremer o título.
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-text-secondary">
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    Título
                  </th>
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    Tipo
                  </th>
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    Publicação / prazo
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Finalização
                  </th>
                </tr>
              </thead>
              <ItemSection
                label={`Atrasados · últimos ${OLD_LATE_DAYS} dias`}
                tone="late"
                items={sections.recentLate}
                renderRow={renderRow}
              />
              <ItemSection label="Próximos" items={sections.upcoming} renderRow={renderRow} />
              <ItemSection label="Sem data" items={sections.noDate} renderRow={renderRow} />
              <ItemSection
                label={`Atrasados há mais de ${OLD_LATE_DAYS} dias`}
                items={sections.oldLate}
                renderRow={renderRow}
                collapsed={!showOldLate}
                onToggle={() => setShowOldLate((v) => !v)}
              />
              <ItemSection
                label="Concluídos"
                items={sections.done}
                renderRow={renderRow}
                collapsed={!showDone}
                onToggle={() => setShowDone((v) => !v)}
              />
            </table>
          </div>
        )
      ) : (
        <ProjectCalendar
          items={shownItems.filter((i) => filter === "tudo" || i.kind === filter)}
          initialMonth={initialMonth}
          onOpen={open}
          onAdd={(kind, date) => setCreating({ kind, date })}
          onMoved={() => router.refresh()}
        />
      )}

      {creating?.kind === "post" && (
        <ContentPostModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          defaultClientId={defaultClientId}
          defaultProjectId={projectId}
          defaultDate={creating.date ?? undefined}
          onClose={() => setCreating(null)}
        />
      )}
      {creating?.kind === "task" && (
        <ProductionTaskModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          defaultClientId={defaultClientId}
          defaultProjectId={projectId}
          defaultDate={creating.date ?? undefined}
          onClose={() => setCreating(null)}
        />
      )}
      {editingPost && (
        <ContentPostModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          post={editingPost}
          onClose={() => setEditingPost(null)}
        />
      )}
      {editingTask && (
        <ProductionTaskModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

/**
 * Um bloco da tabela (atrasados, próximos...). Com `onToggle`, o bloco começa
 * recolhido e mostra só a linha com o total, que abre e fecha.
 */
function ItemSection({
  label,
  items,
  renderRow,
  tone,
  collapsed = false,
  onToggle,
}: {
  label: string;
  items: ProjectItem[];
  renderRow: (item: ProjectItem) => React.ReactNode;
  tone?: "late";
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  if (items.length === 0) return null;

  const title = (
    <>
      {label} · {items.length}
    </>
  );

  return (
    <tbody className="divide-y divide-border">
      <tr>
        <th
          scope="colgroup"
          colSpan={5}
          className={cn(
            "pb-1.5 pt-4 text-left text-xs font-semibold",
            tone === "late" ? "text-red-600" : "text-text-secondary",
          )}
        >
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={!collapsed}
              className="-my-1 flex items-center gap-1 rounded py-1 hover:text-text-primary"
            >
              <ChevronRight
                size={14}
                className={cn("transition-transform", !collapsed && "rotate-90")}
              />
              {title}
            </button>
          ) : (
            title
          )}
        </th>
      </tr>
      {!collapsed && items.map(renderRow)}
    </tbody>
  );
}

/**
 * O selo de status é um seletor: clicar abre a lista e escolher já grava.
 * "Prazo perdido" é gravado pelo sistema, então só aparece se já for o atual.
 */
function StatusSelect({
  item,
  current,
  onChange,
}: {
  item: ProjectItem;
  current: string;
  onChange: (status: string) => void;
}) {
  const labels: Record<string, string> =
    item.kind === "post" ? contentStatusLabels : productionStatusLabels;
  const options = Object.keys(labels).filter((s) => s !== "PRAZO_PERDIDO" || s === current);
  return (
    <select
      aria-label={`Status de ${item.title}`}
      title="Mudar status"
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "cursor-pointer appearance-none whitespace-nowrap rounded-full border-0 px-2 py-0.5 text-[11px] font-medium outline-none hover:ring-1 hover:ring-border focus-visible:ring-2 focus-visible:ring-accent",
        item.statusColor,
      )}
    >
      {options.map((s) => (
        <option key={s} value={s} className="bg-surface text-text-primary">
          {labels[s]}
        </option>
      ))}
    </select>
  );
}

/**
 * Data que vira campo ao clicar. Grava sozinha um instante depois da última
 * mudança (digitar o dia não salva no meio do número) e ao sair do campo;
 * Esc desiste.
 */
function DateCell({
  value,
  emptyLabel,
  label,
  className,
  onSave,
}: {
  value: string | null;
  emptyLabel: string;
  label: string;
  className?: string;
  onSave: (date: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const pending = useRef<string | null | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = undefined;
    if (next !== undefined && next !== value) onSave(next);
  }

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        aria-label={label}
        defaultValue={value ?? ""}
        onFocus={(e) => {
          try {
            e.currentTarget.showPicker();
          } catch {
            // Alguns navegadores não deixam abrir o calendário por código.
          }
        }}
        onChange={(e) => {
          const v = e.target.value;
          // Ano ainda sendo digitado (0002, 0020...) não é uma data de verdade.
          if (v && Number(v.slice(0, 4)) < 1900) return;
          pending.current = v || null;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(flush, 700);
        }}
        onBlur={() => {
          flush();
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            if (timer.current) clearTimeout(timer.current);
            pending.current = undefined;
            setEditing(false);
          }
        }}
        className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
      />
    );
  }

  return (
    <button
      type="button"
      title={`Mudar ${label.toLowerCase()}`}
      onClick={() => setEditing(true)}
      className={cn(
        "-mx-1 rounded px-1 text-left hover:bg-hover hover:ring-1 hover:ring-border",
        value ? "text-text-secondary" : "text-text-secondary/60",
        className,
      )}
    >
      {value ? formatDateBR(new Date(value)) : emptyLabel}
    </button>
  );
}
