"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Plus, Upload } from "lucide-react";
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
import { AttentionBadge, Button, Card, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, monthNameBR } from "@/lib/utils";
import { ContentPostModal, type ClientOption, type ProjectOption, type PostRecord } from "./ContentPostModal";
import { ProductionTaskModal, type TaskRecord } from "./ProductionTaskModal";
import { ImportCalendarioModal } from "./ImportCalendarioModal";

export type CalendarItem = {
  id: string;
  kind: "post" | "task";
  title: string;
  day: number;
  statusLabel: string;
  statusColor: string;
  /** Null = item interno do negócio, sem cliente do outro lado. */
  clientName: string | null;
  overdue: boolean;
  record: PostRecord | TaskRecord;
};

type CreatingState = { kind: "post" | "task"; date: string | null };

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function buildMonthGrid(month: number, year: number) {
  const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateStringForDay(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function ItemCard({ item, onOpen }: { item: CalendarItem; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${item.kind}-${item.id}`,
    data: { item },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      type="button"
      onClick={onOpen}
      className={cn(
        "flex touch-none cursor-grab flex-col items-start rounded px-1.5 py-1 text-left text-[11px] leading-tight active:cursor-grabbing",
        item.statusColor,
        isDragging && "relative z-20 opacity-60 shadow-md",
      )}
    >
      <span className="line-clamp-2 font-medium">{item.title}</span>
      {item.clientName ? (
        <span className="opacity-80">{item.clientName}</span>
      ) : (
        <span className="rounded-sm bg-black/10 px-1 text-[10px] font-semibold uppercase tracking-wide">
          Interno
        </span>
      )}
      {item.overdue && (
        <AttentionBadge level="atrasado" className="mt-0.5">
          Atrasado
        </AttentionBadge>
      )}
    </button>
  );
}

function DayCell({
  day,
  items,
  menuOpen,
  onToggleMenu,
  onOpenItem,
  onAdd,
}: {
  day: number;
  items: CalendarItem[];
  menuOpen: boolean;
  onToggleMenu: () => void;
  onOpenItem: (item: CalendarItem) => void;
  onAdd: (kind: "post" | "task") => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[90px] flex-col gap-1 rounded-md border border-border p-1 transition-colors",
        isOver && "border-accent bg-accent/10",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-text-secondary">{day}</span>
        <div className="relative">
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label={`Adicionar no dia ${day}`}
            className="rounded p-0.5 text-text-secondary opacity-60 hover:bg-hover hover:opacity-100"
          >
            <Plus size={12} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 flex gap-1 whitespace-nowrap rounded-md border border-border bg-surface p-1 shadow-md">
              <button
                type="button"
                onClick={() => onAdd("post")}
                className="rounded px-1.5 py-1 text-[11px] hover:bg-hover"
              >
                + Post
              </button>
              <button
                type="button"
                onClick={() => onAdd("task")}
                className="rounded px-1.5 py-1 text-[11px] hover:bg-hover"
              >
                + Tarefa
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <ItemCard key={`${item.kind}-${item.id}`} item={item} onOpen={() => onOpenItem(item)} />
        ))}
      </div>
    </div>
  );
}

export function CalendarBoard({
  businessId,
  month,
  year,
  items,
  clients,
  projects,
}: {
  businessId: string;
  month: number;
  year: number;
  items: CalendarItem[];
  clients: ClientOption[];
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "lista" ? "lista" : "grade";

  // A tela vive de um `router.refresh()` server-driven: quando o servidor manda
  // itens novos (mudou o mês, salvou um modal), a cópia local precisa acompanhar.
  // Ajustar durante a renderização (em vez de um efeito) evita o re-render em
  // cascata de um `setState` síncrono dentro de `useEffect`.
  const [prevItems, setPrevItems] = useState(items);
  const [localItems, setLocalItems] = useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
    setLocalItems(items);
  }

  const [editing, setEditing] = useState<CalendarItem | null>(null);
  const [creating, setCreating] = useState<CreatingState | null>(null);
  const [menuDay, setMenuDay] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const cells = buildMonthGrid(month, year);

  const itemsByDay = localItems.reduce<Record<number, CalendarItem[]>>((acc, item) => {
    (acc[item.day] ??= []).push(item);
    return acc;
  }, {});

  function setView(next: "grade" | "lista") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "grade") params.delete("view");
    else params.set("view", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  function openCreate(kind: "post" | "task", day?: number) {
    setMenuDay(null);
    setCreating({ kind, date: day !== undefined ? dateStringForDay(year, month, day) : null });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const targetDay = Number(String(over.id).replace("day-", ""));
    const item = active.data.current?.item as CalendarItem | undefined;
    if (!item || Number.isNaN(targetDay) || item.day === targetDay) return;

    const previous = localItems;
    setLocalItems((prev) =>
      prev.map((i) => (i.kind === item.kind && i.id === item.id ? { ...i, day: targetDay } : i)),
    );

    const dateStr = dateStringForDay(year, month, targetDay);
    const url = item.kind === "post" ? `/api/ace/posts/${item.id}` : `/api/ace/tasks/${item.id}`;
    const payload = item.kind === "post" ? { publishDate: dateStr } : { dueDate: dateStr };

    try {
      await api.patch(url, payload);
      router.refresh();
    } catch (e) {
      setLocalItems(previous);
      notify(errorMessage(e), "error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openCreate("post")}>
            <Plus size={14} />
            Novo post
          </Button>
          <Button variant="secondary" onClick={() => openCreate("task")}>
            <Plus size={14} />
            Nova tarefa
          </Button>
          <Button variant="secondary" onClick={() => setImporting(true)}>
            <Upload size={14} />
            Importar do bot
          </Button>
        </div>
        <div className="flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => setView("grade")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium",
              view === "grade" ? "bg-accent text-accent-contrast" : "text-text-secondary hover:bg-hover",
            )}
          >
            <LayoutGrid size={13} />
            Grade
          </button>
          <button
            type="button"
            onClick={() => setView("lista")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium",
              view === "lista" ? "bg-accent text-accent-contrast" : "text-text-secondary hover:bg-hover",
            )}
          >
            <List size={13} />
            Lista
          </button>
        </div>
      </div>

      {view === "grade" ? (
        <Card className="overflow-x-auto p-2">
          {menuDay !== null && (
            <div className="fixed inset-0 z-20" onClick={() => setMenuDay(null)} />
          )}
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid min-w-[560px] grid-cols-7 gap-1">
              {weekdayLabels.map((w) => (
                <div key={w} className="px-1 py-1 text-center text-xs font-medium text-text-secondary">
                  {w}
                </div>
              ))}
              {cells.map((day, i) =>
                day === null ? (
                  <div key={i} className="min-h-[90px] rounded-md border border-transparent p-1" />
                ) : (
                  <DayCell
                    key={i}
                    day={day}
                    items={itemsByDay[day] ?? []}
                    menuOpen={menuDay === day}
                    onToggleMenu={() => setMenuDay((prev) => (prev === day ? null : day))}
                    onOpenItem={setEditing}
                    onAdd={(kind) => openCreate(kind, day)}
                  />
                ),
              )}
            </div>
          </DndContext>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4 p-3">
          {Array.from({ length: cells.length / 7 }, (_, weekIndex) => {
            const daysInWeek = cells
              .slice(weekIndex * 7, weekIndex * 7 + 7)
              .filter((d): d is number => d !== null);
            if (daysInWeek.length === 0) return null;

            const weekItems = daysInWeek
              .flatMap((d) => itemsByDay[d] ?? [])
              .sort((a, b) => a.day - b.day);

            const rangeLabel = `${daysInWeek[0]}–${daysInWeek[daysInWeek.length - 1]} de ${monthNameBR(month).toLowerCase()}`;

            return (
              <div key={weekIndex} className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  {rangeLabel}
                </p>
                {weekItems.length === 0 ? (
                  <p className="text-xs text-text-secondary">Nada planejado.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {weekItems.map((item) => (
                      <button
                        key={`${item.kind}-${item.id}`}
                        type="button"
                        onClick={() => setEditing(item)}
                        className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-left text-sm hover:bg-hover"
                      >
                        <span className="w-6 shrink-0 text-xs text-text-secondary">
                          {String(item.day).padStart(2, "0")}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                            item.statusColor,
                          )}
                        >
                          {item.statusLabel}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-text-primary">
                          {item.title}
                        </span>
                        {item.clientName && (
                          <span className="shrink-0 text-xs text-text-secondary">{item.clientName}</span>
                        )}
                        {item.overdue && <AttentionBadge level="atrasado">Atrasado</AttentionBadge>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {editing && editing.kind === "post" && (
        <ContentPostModal
          businessId={businessId}
          clients={clients}
          projects={projects}
          post={editing.record as PostRecord}
          onClose={() => setEditing(null)}
        />
      )}
      {editing && editing.kind === "task" && (
        <ProductionTaskModal
          businessId={businessId}
          clients={clients}
          projects={projects}
          task={editing.record as TaskRecord}
          onClose={() => setEditing(null)}
        />
      )}
      {creating?.kind === "post" && (
        <ContentPostModal
          businessId={businessId}
          clients={clients}
          projects={projects}
          defaultDate={creating.date ?? undefined}
          onClose={() => setCreating(null)}
        />
      )}
      {creating?.kind === "task" && (
        <ProductionTaskModal
          businessId={businessId}
          clients={clients}
          projects={projects}
          defaultDate={creating.date ?? undefined}
          onClose={() => setCreating(null)}
        />
      )}
      {importing && (
        <ImportCalendarioModal
          businessId={businessId}
          clients={clients}
          projects={projects}
          onClose={() => setImporting(false)}
        />
      )}
    </div>
  );
}
