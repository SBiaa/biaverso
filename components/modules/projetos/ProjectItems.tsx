"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FileText, ListTodo, Plus, Table2 } from "lucide-react";
import { AttentionBadge, Button } from "@/components/ui";
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

const dayOf = (iso: string | null) => (iso ? toDateInputValue(iso) : null);

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

  const initialMonth = useMemo(
    () => pickInitialMonth(today, startDate, endDate, items),
    // Só a primeira vez: depois o calendário guarda o mês que a pessoa navegou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const rows = useMemo(
    () =>
      items
        .filter((i) => filter === "tudo" || i.kind === filter)
        // Pendentes primeiro, por data; sem data no fim.
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          if (a.date !== b.date) return (a.date ?? "9999") < (b.date ?? "9999") ? -1 : 1;
          return a.title.localeCompare(b.title, "pt-BR");
        }),
    [items, filter],
  );

  const count = (f: Filter) => items.filter((i) => f === "tudo" || i.kind === f).length;
  const openCount = items.filter((i) => !i.done).length;
  const lateCount = items.filter((i) => !i.done && !i.missed && i.date && i.date < today).length;
  const missedCount = items.filter((i) => !i.done && i.missed).length;

  function open(item: ProjectItem) {
    if (item.kind === "post") {
      setEditingPost(posts.find((p) => p.id === item.id) ?? null);
    } else {
      setEditingTask(tasks.find((t) => t.id === item.id) ?? null);
    }
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
              {openCount} {openCount === 1 ? "aberto" : "abertos"}
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
        rows.length === 0 ? (
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
              <tbody className="divide-y divide-border">
                {rows.map((item) => {
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
                      <td className="py-2 pr-3 align-top">
                        <span
                          className={cn(
                            "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
                            item.statusColor,
                          )}
                        >
                          {item.statusLabel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 align-top">
                        {item.date ? (
                          <span
                            className={cn("text-text-secondary", late && "font-medium text-red-600")}
                          >
                            {formatDateBR(new Date(item.date))}
                          </span>
                        ) : (
                          <span className="text-text-secondary/60">Sem data</span>
                        )}
                        {late && (
                          <AttentionBadge level="atrasado" className="ml-1.5">
                            Atrasado
                          </AttentionBadge>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2 align-top text-text-secondary">
                        {item.finishedOn ? (
                          formatDateBR(new Date(item.finishedOn))
                        ) : (
                          <span className="text-text-secondary/60">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <ProjectCalendar
          items={items.filter((i) => filter === "tudo" || i.kind === filter)}
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
