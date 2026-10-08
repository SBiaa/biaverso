"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FileText, FolderKanban, LayoutGrid, ListTodo } from "lucide-react";
import { cn, formatDateBR, todayInputValue } from "@/lib/utils";
import { ProjectCalendar, type ProjectItem } from "./ProjectCalendar";

type View = "calendario" | "projetos";

const AGENDA_LIMIT = 12;
const AGENDA_OVERDUE = 4;

/**
 * Visão geral dos projetos: calendário com tudo de todos os projetos e, ao
 * lado, a fila do que vence primeiro. A aba "Projetos" mostra os cards.
 */
export function ProjectsOverviewTabs({
  items,
  grid,
}: {
  items: ProjectItem[];
  /** Os cards de projeto (renderizados no servidor pela página). */
  grid: ReactNode;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("calendario");
  const today = todayInputValue();

  const { overdue, upcoming } = useMemo(() => {
    const open = items
      .filter((i) => !i.done && !i.missed && i.date)
      .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
    return {
      overdue: open.filter((i) => i.date! < today),
      upcoming: open.filter((i) => i.date! >= today),
    };
  }, [items, today]);

  const initialMonth = {
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)),
  };

  function open(item: ProjectItem) {
    if (item.context) router.push(item.context.href);
  }

  // Atrasados antigos engoliriam a lista: só os mais recentes entram, o resto vira o contador.
  const agenda = [...overdue.slice(-AGENDA_OVERDUE), ...upcoming].slice(0, AGENDA_LIMIT);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex overflow-hidden self-start rounded-md border border-border">
        {(
          [
            { id: "calendario", label: "Calendário", icon: CalendarDays },
            { id: "projetos", label: "Projetos", icon: LayoutGrid },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-pressed={view === id}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-xs font-medium",
              view === id ? "bg-accent text-accent-contrast" : "text-text-secondary hover:bg-hover",
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {view === "projetos" ? (
        grid
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <ProjectCalendar
            items={items}
            showFinishing={false}
            initialMonth={initialMonth}
            onOpen={open}
            onMoved={() => router.refresh()}
          />

          <aside className="rounded-lg border border-border p-3">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Próximos prazos</h3>
            {agenda.length === 0 ? (
              <p className="text-sm text-text-secondary">Nada pendente com data.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {agenda.map((item) => {
                  const late = item.date! < today;
                  const Icon =
                    item.kind === "post" ? FileText : item.kind === "task" ? ListTodo : FolderKanban;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => open(item)}
                        className="flex w-full items-start gap-2 py-2 text-left hover:bg-hover"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-1 size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: item.context?.color }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-1 text-sm text-text-primary">
                            <Icon size={13} className="mt-0.5 shrink-0 text-text-secondary" />
                            <span className="line-clamp-2">
                              {item.kind === "project" ? `Fim: ${item.title}` : item.title}
                            </span>
                          </span>
                          <span className="block truncate text-[11px] text-text-secondary">
                            {item.context?.projectName} · {item.context?.businessName}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[11px]",
                            late ? "font-medium text-red-600" : "text-text-secondary",
                          )}
                        >
                          {formatDateBR(new Date(item.date!))}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {overdue.length > 0 && (
              <p className="mt-2 text-[11px] font-medium text-red-600">
                {overdue.length} {overdue.length === 1 ? "atrasado" : "atrasados"} no total
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
