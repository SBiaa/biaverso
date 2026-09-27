import { energyLabels, moodScale } from "@/lib/labels";
import type { MonthDayMood } from "@/lib/avaliacao";
import {
  CHART_WIDTH,
  PLOT_LEFT,
  PLOT_RIGHT,
  dayCenter,
  dayTicks,
} from "./month-chart";

/**
 * O humor do mês como uma linha: um ponto por dia com humor marcado, na altura
 * da nota (1 a 5). A linha quebra onde há dia sem registro — emendar por cima
 * de um buraco inventaria um humor que ela não marcou.
 *
 * Embaixo, quantos dias de cada carinha, e a energia. SVG puro, sem script.
 */

const TOP = 22;
const STEP = 26;
const BASELINE = TOP + STEP * (moodScale.length - 1);

function yFor(score: number) {
  return BASELINE - (score - 1) * STEP;
}

const ENERGY_ORDER = ["ALTA", "MEDIA", "BAIXA"] as const;

export function MoodMonthChart({
  days,
  daysInMonth,
  counts,
  average,
  energy,
}: {
  days: MonthDayMood[];
  daysInMonth: number;
  counts: number[];
  average: number | null;
  energy: Record<(typeof ENERGY_ORDER)[number], number>;
}) {
  if (days.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhum humor registrado neste mês.
      </p>
    );
  }

  // Trechos contínuos: só liga dias consecutivos.
  const segments: MonthDayMood[][] = [];
  for (const point of days) {
    const current = segments[segments.length - 1];
    if (current && current[current.length - 1].day === point.day - 1) {
      current.push(point);
    } else {
      segments.push([point]);
    }
  }

  const averageMood =
    average === null
      ? null
      : moodScale[Math.min(moodScale.length - 1, Math.max(0, Math.round(average) - 1))];
  const maxCount = Math.max(1, ...counts);
  const energyTotal = ENERGY_ORDER.reduce((sum, level) => sum + energy[level], 0);

  return (
    <div className="flex flex-col gap-4">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${BASELINE + 22}`}
        role="img"
        aria-label="Humor por dia do mês, do pior ao melhor."
        className="w-full"
      >
        {moodScale.map((emoji, index) => {
          const y = yFor(index + 1);
          return (
            <g key={emoji}>
              <line
                x1={PLOT_LEFT}
                x2={PLOT_RIGHT}
                y1={y}
                y2={y}
                strokeWidth={1}
                strokeDasharray="2 3"
                className="stroke-border"
              />
              <text
                x={PLOT_LEFT - 10}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[14px]"
              >
                {emoji}
              </text>
            </g>
          );
        })}

        {segments.map((segment) =>
          segment.length < 2 ? null : (
            <polyline
              key={segment[0].day}
              points={segment
                .map((p) => `${dayCenter(p.day, daysInMonth)},${yFor(p.score)}`)
                .join(" ")}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="stroke-accent"
            />
          ),
        )}

        {days.map((p) => {
          const cx = dayCenter(p.day, daysInMonth);
          const cy = yFor(p.score);
          return (
            <g key={p.day}>
              <title>{`Dia ${p.day} · ${p.mood}`}</title>
              {/* Alvo de hover maior que o ponto. */}
              <circle cx={cx} cy={cy} r={9} fill="transparent" />
              <circle
                cx={cx}
                cy={cy}
                r={4}
                strokeWidth={2}
                className="fill-accent stroke-surface"
              />
            </g>
          );
        })}

        {dayTicks(daysInMonth).map((day) => (
          <text
            key={day}
            x={dayCenter(day, daysInMonth)}
            y={BASELINE + 16}
            textAnchor="middle"
            className="fill-text-secondary text-[11px]"
          >
            {day}
          </text>
        ))}
      </svg>

      <div className="grid grid-cols-5 gap-2">
        {moodScale.map((emoji, index) => {
          const count = counts[index];
          return (
            <div key={emoji} className="flex flex-col items-center gap-1">
              <span className="text-lg leading-none">{emoji}</span>
              <span className="text-xs text-text-secondary">
                {count} {count === 1 ? "dia" : "dias"}
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        {averageMood && (
          <span className="text-text-primary">
            Humor médio: <span className="text-base">{averageMood}</span>
          </span>
        )}
        {energyTotal > 0 && (
          <span className="text-text-secondary">
            Energia:{" "}
            {ENERGY_ORDER.filter((level) => energy[level] > 0)
              .map(
                (level) =>
                  `${energyLabels[level].toLowerCase()} em ${energy[level]} ${energy[level] === 1 ? "dia" : "dias"}`,
              )
              .join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
}
