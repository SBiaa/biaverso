import type { ReactNode } from "react";
import {
  instantToMinutes,
  timeToMinutes,
  type ActivityCategoryDTO,
  type TimeBlockDTO,
  type TimeEntryDTO,
} from "@/lib/time-tracking-shared";

const HOUR_HEIGHT = 24;
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;
const MIN_BAR_HEIGHT = 6;

function topFor(minutes: number) {
  return (minutes / 60) * HOUR_HEIGHT;
}

function heightFor(startMinutes: number, endMinutes: number) {
  return Math.max(MIN_BAR_HEIGHT, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT);
}

function Lane({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`} style={{ height: TOTAL_HEIGHT }}>
      {Array.from({ length: 13 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-border/60"
          style={{ top: i * HOUR_HEIGHT * 2 }}
        />
      ))}
      {children}
    </div>
  );
}

export function DayTimeline({
  categories,
  blocks,
  entries,
  nowMinutes,
}: {
  categories: ActivityCategoryDTO[];
  blocks: TimeBlockDTO[];
  entries: TimeEntryDTO[];
  /** Minutos desde a meia-noite, se o dia mostrado for hoje — desenha a linha "agora". */
  nowMinutes?: number | null;
}) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="flex gap-2">
      <div className="w-10 shrink-0" style={{ height: TOTAL_HEIGHT }}>
        {Array.from({ length: 13 }).map((_, i) => (
          <div
            key={i}
            className="text-right text-[10px] text-text-secondary"
            style={{ height: HOUR_HEIGHT * 2 }}
          >
            {String(i * 2).padStart(2, "0")}h
          </div>
        ))}
      </div>

      <div className="flex flex-1 gap-1">
        <div className="flex-1">
          <p className="mb-1 text-center text-[10px] font-medium uppercase text-text-secondary">
            Planejado
          </p>
          <Lane className="rounded-md border border-border">
            {blocks.map((block) => {
              const category = categoryById.get(block.categoryId);
              const start = timeToMinutes(block.startTime);
              const end = timeToMinutes(block.endTime);
              return (
                <div
                  key={block.id}
                  title={`${category?.name ?? ""} · ${block.startTime}–${block.endTime}`}
                  className="absolute left-0.5 right-0.5 overflow-hidden rounded px-1 text-[10px] text-white"
                  style={{
                    top: topFor(start),
                    height: heightFor(start, end),
                    backgroundColor: category?.color ?? "#6366F1",
                  }}
                >
                  {category?.name}
                </div>
              );
            })}
          </Lane>
        </div>

        <div className="flex-1">
          <p className="mb-1 text-center text-[10px] font-medium uppercase text-text-secondary">
            Realizado
          </p>
          <Lane className="rounded-md border border-border">
            {entries.map((entry) => {
              const category = categoryById.get(entry.categoryId);
              const start = instantToMinutes(entry.startedAt);
              const end = entry.endedAt ? instantToMinutes(entry.endedAt) : (nowMinutes ?? start);
              return (
                <div
                  key={entry.id}
                  title={category?.name ?? ""}
                  className="absolute left-0.5 right-0.5 overflow-hidden rounded px-1 text-[10px] text-white"
                  style={{
                    top: topFor(start),
                    height: heightFor(start, end),
                    backgroundColor: category?.color ?? "#6366F1",
                    opacity: entry.endedAt ? 1 : 0.7,
                  }}
                >
                  {category?.name}
                </div>
              );
            })}
            {nowMinutes != null && (
              <div
                className="absolute left-0 right-0 border-t-2 border-accent"
                style={{ top: topFor(nowMinutes) }}
              />
            )}
          </Lane>
        </div>
      </div>
    </div>
  );
}
