"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WEEKDAY_LABELS, weekdayIndex } from "@/lib/cardapio";
import { cn } from "@/lib/utils";
import {
  instantToMinutes,
  timeToMinutes,
  type ActivityCategoryDTO,
  type TimeBlockDTO,
} from "@/lib/time-tracking-shared";
import type { RangeDayBlocks } from "@/lib/time-tracking";
import { TimeBlockModal } from "./TimeBlockModal";

const HOUR_HEIGHT = 48;
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;
const MIN_BLOCK_HEIGHT = 20;
const COLUMN_MIN_WIDTH = 160;
const HOUR_COLUMN_WIDTH = 48;

function topFor(minutes: number) {
  return (minutes / 60) * HOUR_HEIGHT;
}

function heightFor(startMinutes: number, endMinutes: number) {
  return Math.max(MIN_BLOCK_HEIGHT, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT);
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type ModalState =
  | { mode: "create"; dayId: string; initial: { categoryId: string; startTime: string; endTime: string } }
  | { mode: "edit"; block: TimeBlockDTO }
  | null;

export function TimeGridCalendar({
  days,
  categories,
  todayDate,
}: {
  days: RangeDayBlocks[];
  categories: ActivityCategoryDTO[];
  todayDate: string;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const nowMinutes = instantToMinutes(new Date().toISOString());

  // Abre a grade já rolada pra manhã — ninguém quer ver 00h–06h vazio primeiro.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: topFor(7 * 60) - 24 });
  }, []);

  const gridTemplate = `${HOUR_COLUMN_WIDTH}px repeat(${days.length}, minmax(${COLUMN_MIN_WIDTH}px, 1fr))`;

  function handleColumnClick(event: React.MouseEvent<HTMLDivElement>, day: RangeDayBlocks) {
    if (event.target !== event.currentTarget || categories.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawMinutes = ((event.clientY - rect.top) / HOUR_HEIGHT) * 60;
    const startMinutes = Math.max(0, Math.min(23 * 60, Math.round(rawMinutes / 15) * 15));
    setModal({
      mode: "create",
      dayId: day.dayId,
      initial: {
        categoryId: categories[0].id,
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(Math.min(23 * 60 + 59, startMinutes + 60)),
      },
    });
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: HOUR_COLUMN_WIDTH + days.length * COLUMN_MIN_WIDTH }}>
        {/* Cabeçalho fixo — só o corpo (as horas) rola. */}
        <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
          <div />
          {days.map((day) => {
            const wd = weekdayIndex(new Date(day.date));
            const isToday = day.date === todayDate;
            return (
              <Link
                key={day.dayId}
                href={`/horas?date=${day.date}`}
                className={cn(
                  "border-b border-border py-2 text-center text-sm font-semibold hover:underline",
                  isToday ? "text-accent" : "text-text-primary",
                )}
              >
                {WEEKDAY_LABELS[wd]}{" "}
                <span className="font-normal">{Number(day.date.slice(8, 10))}</span>
              </Link>
            );
          })}
        </div>

        <div ref={bodyRef} className="max-h-[640px] overflow-y-auto">
          <div className="relative grid" style={{ gridTemplateColumns: gridTemplate }}>
            {/* Coluna das horas */}
            <div className="relative" style={{ height: TOTAL_HEIGHT }}>
              {Array.from({ length: 24 }).map((_, hour) => (
                <span
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-[11px] text-text-secondary"
                  style={{ top: topFor(hour * 60) }}
                >
                  {String(hour).padStart(2, "0")}h
                </span>
              ))}
            </div>

            {days.map((day) => {
              const isToday = day.date === todayDate;
              return (
                <div
                  key={day.dayId}
                  onClick={(e) => handleColumnClick(e, day)}
                  className={cn(
                    "relative cursor-crosshair border-l border-border",
                    isToday && "bg-accent/[0.03]",
                  )}
                  style={{ height: TOTAL_HEIGHT }}
                >
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div
                      key={hour}
                      className="pointer-events-none absolute left-0 right-0 border-t border-border/60"
                      style={{ top: topFor(hour * 60) }}
                    />
                  ))}

                  {isToday && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-accent"
                      style={{ top: topFor(nowMinutes) }}
                    />
                  )}

                  {day.blocks.map((block) => {
                    const category = categoryById.get(block.categoryId);
                    const categoryName = category?.name ?? "Categoria removida";
                    const start = timeToMinutes(block.startTime);
                    const end = timeToMinutes(block.endTime);
                    const blockHeight = heightFor(start, end);
                    // Um bloco curto não tem altura para 3 linhas sem sobrepor
                    // texto — vira uma linha só, igual a agendas de verdade.
                    const isCompact = blockHeight < 50;
                    return (
                      <button
                        key={block.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal({ mode: "edit", block });
                        }}
                        className="absolute left-0.5 right-0.5 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight text-white shadow-sm transition-opacity hover:opacity-90"
                        style={{
                          top: topFor(start),
                          height: blockHeight,
                          backgroundColor: category?.color ?? "#6366F1",
                        }}
                      >
                        {isCompact ? (
                          <span className="block truncate font-medium">
                            {block.startTime} {categoryName}
                            {block.title ? ` · ${block.title}` : ""}
                          </span>
                        ) : (
                          <>
                            <span className="block truncate font-medium">{categoryName}</span>
                            {block.title && <span className="block truncate opacity-90">{block.title}</span>}
                            <span className="block opacity-80">
                              {block.startTime}–{block.endTime}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modal?.mode === "create" && (
        <TimeBlockModal
          mode="create"
          dayId={modal.dayId}
          initial={modal.initial}
          categories={categories}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "edit" && (
        <TimeBlockModal
          mode="edit"
          block={modal.block}
          categories={categories}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
