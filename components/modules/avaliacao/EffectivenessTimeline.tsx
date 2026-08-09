import { Star } from "lucide-react";
import { starsValues } from "@/lib/labels";

type WeekPoint = {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  effectiveness: string | null;
};

function shortDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function EffectivenessTimeline({ weeks }: { weeks: WeekPoint[] }) {
  if (weeks.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhuma semana avaliada nos últimos meses.
      </p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {weeks.map((week) => {
        const stars = week.effectiveness
          ? starsValues.indexOf(week.effectiveness) + 1
          : 0;
        return (
          <div
            key={week.id}
            className="flex shrink-0 flex-col items-center gap-1 rounded-lg border border-border px-3 py-2"
          >
            <span className="text-xs text-text-secondary">
              {shortDate(week.weekStart)}
            </span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={11}
                  className={i < stars ? "text-accent" : "text-border"}
                  fill={i < stars ? "currentColor" : "none"}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
