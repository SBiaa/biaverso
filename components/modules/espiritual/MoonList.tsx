import { formatDateLongBR } from "@/lib/utils";
import { formatTimeBR, type MoonEvent } from "@/lib/astros";
import { moonPhaseGlyph } from "@/lib/espiritual-shared";
import { daysAwayLabel } from "./MoonCard";

/** As luas novas e cheias que vêm — os esbats, em fila. */
export function MoonList({
  events,
  today,
}: {
  events: MoonEvent[];
  today: Date;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-text-secondary">Nenhuma lua no período.</p>;
  }

  return (
    <ul className="flex flex-col">
      {events.map((event) => {
        const isToday = event.date.getTime() === today.getTime();

        return (
          <li
            key={event.at.toISOString()}
            className="flex items-center gap-3 border-b border-border/60 py-2 last:border-0"
          >
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center rounded-full bg-hover text-base"
            >
              {moonPhaseGlyph[event.kind]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-primary">
                {event.kind === "NOVA" ? "Lua nova" : "Lua cheia"}
                {isToday && (
                  <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                    hoje
                  </span>
                )}
              </p>
              <p className="text-xs text-text-secondary">
                {formatDateLongBR(event.date)} · {formatTimeBR(event.at)}
              </p>
            </div>
            <span className="shrink-0 text-xs text-text-secondary">
              {daysAwayLabel(event.date, today)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
