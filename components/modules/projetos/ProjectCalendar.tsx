"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, FolderKanban, ListTodo, Plus } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatMonthYearBR, todayInputValue } from "@/lib/utils";

/** Item do projeto já pronto para a tela: serve à tabela e ao calendário. */
export type ProjectItem = {
  key: string;
  /** "project" é o fim do projeto: aparece no calendário geral, mas não se arrasta. */
  kind: "post" | "task" | "project";
  id: string;
  title: string;
  typeLabel: string;
  statusLabel: string;
  statusColor: string;
  /** Publicação (post) ou prazo (tarefa), como "YYYY-MM-DD". */
  date: string | null;
  /** Finalização, como "YYYY-MM-DD". */
  finishedOn: string | null;
  /** Já saiu da fila: publicado, concluído ou cancelado. */
  done: boolean;
  /** Estado "prazo perdido": fora da conta de atrasados, contado à parte. */
  missed?: boolean;
  /** Passos da tarefa (feitos/total); ausente em post e quando não há passos. */
  steps?: { done: number; total: number };
  /** Só no calendário geral: de qual projeto/negócio o item é. */
  context?: { projectName: string; businessName: string; color: string; href: string };
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dayKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function buildMonthGrid(month: number, year: number) {
  const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function ItemChip({ item, onOpen }: { item: ProjectItem; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.key,
    data: { item },
    disabled: item.kind === "project",
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={onOpen}
      title={
        item.context
          ? `${item.context.projectName} · ${item.context.businessName} · ${item.typeLabel} · ${item.statusLabel}`
          : `${item.typeLabel} · ${item.statusLabel}`
      }
      style={{
        ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
        ...(item.context ? { borderLeft: `3px solid ${item.context.color}` } : {}),
      }}
      className={cn(
        "flex touch-none items-start gap-1 rounded px-1.5 py-1 text-left text-[11px] leading-tight",
        item.kind === "project" ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        item.statusColor,
        item.done && "opacity-60",
        isDragging && "relative z-20 opacity-70 shadow-md",
      )}
    >
      {item.kind === "post" ? (
        <FileText size={11} className="mt-px shrink-0" />
      ) : item.kind === "task" ? (
        <ListTodo size={11} className="mt-px shrink-0" />
      ) : (
        <FolderKanban size={11} className="mt-px shrink-0" />
      )}
      <span className="line-clamp-2 font-medium">
        {item.kind === "project" ? `Fim: ${item.title}` : item.title}
      </span>
      {item.steps && (
        <span className="ml-auto shrink-0 font-semibold tabular-nums">
          {item.steps.done}/{item.steps.total}
        </span>
      )}
    </button>
  );
}

function DayCell({
  date,
  day,
  isToday,
  items,
  finishing,
  onOpen,
  onAdd,
}: {
  date: string;
  day: number;
  isToday: boolean;
  items: ProjectItem[];
  /** Posts que precisam estar prontos neste dia (a finalização é aqui). */
  finishing: ProjectItem[];
  onOpen: (item: ProjectItem) => void;
  onAdd?: (kind: "post" | "task", date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const [menu, setMenu] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[96px] flex-col gap-1 rounded-md border border-border p-1 transition-colors",
        isToday && "border-accent",
        isOver && "border-accent bg-accent/10",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span
          className={cn(
            "text-xs",
            isToday ? "font-semibold text-accent" : "text-text-secondary",
          )}
        >
          {day}
        </span>
        <div className={cn("relative", !onAdd && "hidden")}>
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label={`Adicionar no dia ${day}`}
            className="rounded p-0.5 text-text-secondary opacity-60 hover:bg-hover hover:opacity-100"
          >
            <Plus size={12} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-full z-30 mt-1 flex gap-1 whitespace-nowrap rounded-md border border-border bg-surface p-1 shadow-md">
                {(["post", "task"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      onAdd?.(kind, date);
                    }}
                    className="rounded px-1.5 py-1 text-[11px] hover:bg-hover"
                  >
                    {kind === "post" ? "+ Post" : "+ Tarefa"}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <ItemChip key={item.key} item={item} onOpen={() => onOpen(item)} />
        ))}
        {finishing.map((item) => (
          <button
            key={`fin-${item.key}`}
            type="button"
            onClick={() => onOpen(item)}
            title={`Finalizar até este dia: ${item.title}`}
            className="flex items-start gap-1 rounded border border-dashed border-border px-1.5 py-1 text-left text-[10px] leading-tight text-text-secondary hover:bg-hover"
          >
            <span className="shrink-0 font-semibold uppercase">Finalizar</span>
            <span className="line-clamp-2">{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Calendário do projeto: posts na data de publicação, tarefas no prazo e, em
 * pontilhado, o dia em que o post precisa estar pronto. Arrastar muda a data.
 */
export function ProjectCalendar({
  items,
  initialMonth,
  onOpen,
  onAdd,
  onMoved,
  showFinishing = true,
}: {
  items: ProjectItem[];
  /** Falso no calendário geral, onde os lembretes pontilhados só poluiriam. */
  showFinishing?: boolean;
  initialMonth: { year: number; month: number };
  onOpen: (item: ProjectItem) => void;
  /** Ausente no calendário geral (lá o item novo nasce dentro do projeto). */
  onAdd?: (kind: "post" | "task", date: string) => void;
  /** Depois de gravar a nova data, para a tela recarregar do servidor. */
  onMoved: () => void;
}) {
  const [{ year, month }, setCursor] = useState(initialMonth);

  // O servidor manda itens novos depois de salvar: a cópia local acompanha.
  // Ajustar durante a renderização evita o efeito com setState em cascata.
  const [prevItems, setPrevItems] = useState(items);
  const [localItems, setLocalItems] = useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
    setLocalItems(items);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const today = todayInputValue();
  const cells = buildMonthGrid(month, year);

  const byDate = new Map<string, ProjectItem[]>();
  const finishingByDate = new Map<string, ProjectItem[]>();
  for (const item of localItems) {
    if (item.date) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
    // Post já publicado ou cancelado não precisa mais de lembrete de finalização.
    if (showFinishing && item.kind === "post" && item.finishedOn && !item.done) {
      finishingByDate.set(item.finishedOn, [
        ...(finishingByDate.get(item.finishedOn) ?? []),
        item,
      ]);
    }
  }

  function shift(delta: number) {
    setCursor(({ year: y, month: m }) => {
      const d = new Date(Date.UTC(y, m - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const item = active.data.current?.item as ProjectItem | undefined;
    if (!over || !item || item.kind === "project") return;

    const target = String(over.id);
    if (item.date === target) return;

    const previous = localItems;
    setLocalItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, date: target } : i)));

    try {
      await api.patch(
        item.kind === "post" ? `/api/ace/posts/${item.id}` : `/api/ace/tasks/${item.id}`,
        item.kind === "post" ? { publishDate: target } : { dueDate: target },
      );
      onMoved();
    } catch (e) {
      setLocalItems(previous);
      notify(errorMessage(e), "error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Mês anterior"
            className="rounded-md p-1.5 text-text-secondary hover:bg-hover"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Próximo mês"
            className="rounded-md p-1.5 text-text-secondary hover:bg-hover"
          >
            <ChevronRight size={16} />
          </button>
          <span className="ml-1 text-sm font-medium text-text-primary">
            {formatMonthYearBR(month, year)}
          </span>
        </div>
        <p
          className={cn(
            "hidden items-center gap-1 text-[11px] text-text-secondary",
            showFinishing && "sm:flex",
          )}
        >
          <span className="rounded border border-dashed border-border px-1 text-[10px] font-semibold uppercase">
            Finalizar
          </span>
          = dia em que o post precisa estar pronto
        </p>
      </div>

      <div className="overflow-x-auto">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid min-w-[640px] grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="px-1 py-1 text-center text-xs font-medium text-text-secondary"
              >
                {w}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={i} className="min-h-[96px] rounded-md" />;
              }
              const date = dayKey(year, month, day);
              return (
                <DayCell
                  key={i}
                  date={date}
                  day={day}
                  isToday={date === today}
                  items={byDate.get(date) ?? []}
                  finishing={finishingByDate.get(date) ?? []}
                  onOpen={onOpen}
                  onAdd={onAdd}
                />
              );
            })}
          </div>
        </DndContext>
      </div>
    </div>
  );
}
