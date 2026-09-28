"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addUtcDays, cn, formatDateRangeBR, toDateInputValue } from "@/lib/utils";
import { CALENDAR_VIEWS, daysForView, type CalendarViewMode } from "@/lib/time-tracking-shared";
import { IconButton } from "@/components/ui";

export function CalendarNav({
  view,
  rangeStart,
}: {
  view: CalendarViewMode;
  /** ISO do primeiro dia visível — já resolvido pelo servidor (semana cai na segunda). */
  rangeStart: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(next: { view?: CalendarViewMode; data?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.view) params.set("view", next.view);
    if (next.data === null) params.delete("data");
    else if (next.data) params.set("data", next.data);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function go(deltaPeriods: number) {
    const next = addUtcDays(new Date(rangeStart), deltaPeriods * daysForView(view));
    push({ data: toDateInputValue(next) });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <IconButton
          onClick={() => go(-1)}
          aria-label="Período anterior"
          className="border border-border"
        >
          <ChevronLeft size={16} />
        </IconButton>
        <button
          type="button"
          onClick={() => push({ data: null })}
          className="text-sm font-semibold text-text-primary hover:text-accent"
        >
          {formatDateRangeBR(new Date(rangeStart), daysForView(view))}
        </button>
        <IconButton
          onClick={() => go(1)}
          aria-label="Próximo período"
          className="border border-border"
        >
          <ChevronRight size={16} />
        </IconButton>
      </div>

      <div className="inline-flex self-start rounded-lg border border-border p-1">
        {CALENDAR_VIEWS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => push({ view: option.value })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === option.value
                ? "bg-accent text-accent-contrast"
                : "text-text-secondary hover:bg-hover",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
