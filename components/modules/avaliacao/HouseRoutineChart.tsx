import { dayTypeLabels } from "@/lib/labels";
import type { MonthDayHouse } from "@/lib/avaliacao";
import {
  CHART_WIDTH,
  PLOT_LEFT,
  PLOT_RIGHT,
  dayCenter,
  dayTicks,
  slotWidth,
} from "./month-chart";

/**
 * Uma barra por dia: a altura é a fração das tarefas de casa daquele dia que
 * foram concluídas. Dia normal é sólido; dia de faxina é listrado, na mesma
 * cor — o acento é configurável, então uma segunda cor fixa podia brigar com
 * ele. A listra funciona em qualquer tema e também impresso.
 *
 * SVG puro, sem script: o `<title>` de cada barra vira o tooltip nativo.
 */

const BASELINE = 138;
const PLOT_HEIGHT = 112;
const PATTERN_ID = "faxina-stripes";

function barPath(x: number, width: number, height: number) {
  if (height <= 0) return "";
  const r = Math.min(3, width / 2, height);
  const top = BASELINE - height;
  return [
    `M${x},${BASELINE}`,
    `V${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `H${x + width - r}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `V${BASELINE}`,
    "Z",
  ].join(" ");
}

function FaxinaPatternDefs() {
  return (
    <defs>
      <pattern
        id={PATTERN_ID}
        patternUnits="userSpaceOnUse"
        width={6}
        height={6}
        patternTransform="rotate(45)"
      >
        <rect width={2.5} height={6} className="fill-accent" />
      </pattern>
    </defs>
  );
}

export function HouseRoutineChart({
  days,
  daysInMonth,
}: {
  days: MonthDayHouse[];
  daysInMonth: number;
}) {
  if (days.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhuma tarefa de casa registrada neste mês.
      </p>
    );
  }

  const slot = slotWidth(daysInMonth);
  const barWidth = Math.max(2, slot - 2);

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} 160`}
        role="img"
        aria-label="Tarefas de casa concluídas por dia do mês."
        className="w-full"
      >
        <FaxinaPatternDefs />

        {/* Régua: 50% e 100%, recessiva. */}
        {[0.5, 1].map((fraction) => {
          const y = BASELINE - PLOT_HEIGHT * fraction;
          return (
            <g key={fraction}>
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
                x={PLOT_LEFT - 4}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-text-secondary text-[11px]"
              >
                {Math.round(fraction * 100)}%
              </text>
            </g>
          );
        })}
        <line
          x1={PLOT_LEFT}
          x2={PLOT_RIGHT}
          y1={BASELINE}
          y2={BASELINE}
          strokeWidth={1}
          className="stroke-border"
        />

        {days.map((d) => {
          const x = dayCenter(d.day, daysInMonth) - barWidth / 2;
          const fraction = d.total === 0 ? 0 : d.done / d.total;
          const height = Math.round(PLOT_HEIGHT * fraction);
          const label = `Dia ${d.day} · ${dayTypeLabels[d.type]} · ${d.done} de ${d.total} tarefas`;
          return (
            <g key={d.day}>
              <title>{label}</title>
              {/* Alvo de hover maior que a barra, para os dias vazios também
                  responderem. */}
              <rect
                x={x - 1}
                y={BASELINE - PLOT_HEIGHT}
                width={barWidth + 2}
                height={PLOT_HEIGHT + 4}
                fill="transparent"
              />
              {height > 0 ? (
                <path
                  d={barPath(x, barWidth, height)}
                  fill={d.type === "FAXINA" ? `url(#${PATTERN_ID})` : undefined}
                  className={d.type === "FAXINA" ? undefined : "fill-accent"}
                />
              ) : (
                // Dia aberto, nada feito: um traço no chão, para não parecer
                // que o dia não existiu.
                <rect
                  x={x}
                  y={BASELINE - 2}
                  width={barWidth}
                  height={2}
                  className="fill-text-secondary opacity-50"
                />
              )}
            </g>
          );
        })}

        {dayTicks(daysInMonth).map((day) => (
          <text
            key={day}
            x={dayCenter(day, daysInMonth)}
            y={BASELINE + 14}
            textAnchor="middle"
            className="fill-text-secondary text-[11px]"
          >
            {day}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent" />
          {dayTypeLabels.NORMAL}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width={12} height={12} className="rounded-sm" aria-hidden>
            <rect width={12} height={12} fill={`url(#${PATTERN_ID})`} />
          </svg>
          {dayTypeLabels.FAXINA}
        </span>
      </div>
    </div>
  );
}
