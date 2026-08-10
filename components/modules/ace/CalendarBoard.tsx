"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ContentPostModal, type ClientOption, type ProjectOption, type PostRecord } from "./ContentPostModal";
import { ProductionTaskModal, type TaskRecord } from "./ProductionTaskModal";

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
  const [editing, setEditing] = useState<CalendarItem | null>(null);
  const [creating, setCreating] = useState<"post" | "task" | null>(null);
  const cells = buildMonthGrid(month, year);

  const itemsByDay = items.reduce<Record<number, CalendarItem[]>>((acc, item) => {
    (acc[item.day] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setCreating("post")}>
          <Plus size={14} />
          Novo post
        </Button>
        <Button variant="secondary" onClick={() => setCreating("task")}>
          <Plus size={14} />
          Nova tarefa
        </Button>
      </div>

      <Card className="overflow-x-auto p-2">
        <div className="grid min-w-[560px] grid-cols-7 gap-1">
          {weekdayLabels.map((w) => (
            <div key={w} className="px-1 py-1 text-center text-xs font-medium text-text-secondary">
              {w}
            </div>
          ))}
          {cells.map((day, i) => (
            <div
              key={i}
              className={cn(
                "flex min-h-[90px] flex-col gap-1 rounded-md border border-border p-1",
                day === null && "border-transparent",
              )}
            >
              {day !== null && (
                <>
                  <span className="px-1 text-xs text-text-secondary">{day}</span>
                  <div className="flex flex-col gap-1">
                    {(itemsByDay[day] ?? []).map((item) => (
                      <button
                        key={`${item.kind}-${item.id}`}
                        type="button"
                        onClick={() => setEditing(item)}
                        className={cn(
                          "flex flex-col items-start rounded px-1.5 py-1 text-left text-[11px] leading-tight",
                          item.statusColor,
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
                          <span className="mt-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            Atrasado
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

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
      {creating === "post" && (
        <ContentPostModal
          businessId={businessId}
          clients={clients}
          projects={projects}
          onClose={() => setCreating(null)}
        />
      )}
      {creating === "task" && (
        <ProductionTaskModal
          businessId={businessId}
          clients={clients}
          projects={projects}
          onClose={() => setCreating(null)}
        />
      )}
    </div>
  );
}
