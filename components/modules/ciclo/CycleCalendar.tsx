"use client";

import { useState } from "react";
import { Card, CardTitle, MonthPicker } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { CalendarDayView } from "@/lib/ciclo-shared";
import { calendarDayClass } from "./shared";
import { DayLogModal } from "./DayLogModal";

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function buildMonthGrid(month: number, year: number, days: CalendarDayView[]) {
  const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: (CalendarDayView | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (const day of days) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CycleCalendar({
  month,
  year,
  days,
}: {
  month: number;
  year: number;
  days: CalendarDayView[];
}) {
  const [editing, setEditing] = useState<CalendarDayView | null>(null);
  const cells = buildMonthGrid(month, year, days);

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Calendário</CardTitle>
        <MonthPicker month={month} year={year} />
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((w) => (
          <div key={w} className="px-1 py-1 text-center text-xs font-medium text-text-secondary">
            {w}
          </div>
        ))}
        {cells.map((cell, i) =>
          cell === null ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => setEditing(cell)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-md text-sm transition-colors hover:opacity-80",
                calendarDayClass[cell.kind],
                cell.isToday && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
              )}
            >
              <span className="font-medium">{cell.day}</span>
              {cell.log && (cell.log.symptoms.length > 0 || cell.log.mood) && (
                <span className="h-1 w-1 rounded-full bg-current opacity-70" />
              )}
            </button>
          ),
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-secondary">
        <LegendDot className="bg-danger-solid-bg" label="Menstruação registrada" />
        <LegendDot className="bg-danger-soft-bg" label="Menstruação prevista" />
        <LegendDot className="bg-warning-soft-bg" label="Ovulação prevista" />
        <LegendDot className="bg-accent/40" label="Janela fértil" />
      </div>

      {editing && (
        <DayLogModal date={editing.date} log={editing.log} onClose={() => setEditing(null)} />
      )}
    </Card>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", className)} />
      {label}
    </span>
  );
}
