import { Card } from "@/components/ui";
import { energyLabels, moodScale } from "@/lib/labels";
import type { TrendKind, TrendSeries, Trends } from "@/lib/avaliacao-tendencias";

/**
 * "Estou avançando ou caindo?" — um cartão pequeno por coisa acompanhada.
 *
 * Cada cartão tem o nome, o valor do período avaliado bem grande, o veredito
 * (seta verde subindo, seta vermelha caindo, traço cinza estável) e a linha
 * dos períodos anteriores com área por baixo, para o olho pegar a forma sem
 * ler número nenhum. O último ponto é o período que está sendo avaliado e
 * ganha destaque.
 *
 * SVG puro, sem script. Período sem dado deixa buraco na linha.
 */

const W = 200;
const H = 56;
const PAD_X = 6;
const PAD_TOP = 8;
const PAD_BOTTOM = 6;

function range(kind: TrendKind, values: (number | null)[]): [number, number] {
  switch (kind) {
    case "percent":
      return [0, 100];
    case "mood":
      return [1, moodScale.length];
    case "energy":
      return [1, 3];
    case "count":
      return [0, Math.max(1, ...values.map((v) => v ?? 0))];
  }
}

function formatValue(kind: TrendKind, value: number) {
  switch (kind) {
    case "percent":
      return `${Math.round(value)}%`;
    case "mood":
      return moodScale[Math.min(moodScale.length - 1, Math.max(0, Math.round(value) - 1))];
    case "energy": {
      const rounded = Math.round(value);
      return energyLabels[rounded <= 1 ? "BAIXA" : rounded === 2 ? "MEDIA" : "ALTA"];
    }
    case "count":
      return String(Math.round(value));
  }
}

function formatDelta(kind: TrendKind, delta: number) {
  const sign = delta > 0 ? "+" : "−";
  const abs = Math.abs(delta);
  switch (kind) {
    case "percent":
      return `${sign}${Math.round(abs)} pts`;
    case "mood":
    case "energy":
      return `${sign}${abs.toFixed(1).replace(".", ",")}`;
    case "count":
      return `${sign}${abs.toFixed(1).replace(".", ",")}`;
  }
}

/** O que o número grande significa, por tipo. */
function unitHint(kind: TrendKind, periodNoun: string) {
  switch (kind) {
    case "percent":
      return `feito n${periodNoun}`;
    case "mood":
      return `humor médio n${periodNoun}`;
    case "energy":
      return `energia média n${periodNoun}`;
    case "count":
      return `entregues n${periodNoun}`;
  }
}

function Verdict({ s }: { s: TrendSeries }) {
  if (!s.trend) {
    return (
      <span className="shrink-0 whitespace-nowrap text-[11px] text-text-secondary opacity-70" title="Ainda não há períodos suficientes para comparar">
        sem base ainda
      </span>
    );
  }
  const { direction, delta } = s.trend;
  const text = formatDelta(s.kind, delta);
  if (direction === "up") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-success-soft-bg px-2 py-0.5 text-[11px] font-semibold text-success-soft-text"
        title="Subindo: a metade recente está acima da anterior"
      >
        <span aria-hidden>▲</span> subindo <span className="font-normal opacity-80">{text}</span>
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-danger-soft-bg px-2 py-0.5 text-[11px] font-semibold text-danger-soft-text"
        title="Caindo: a metade recente está abaixo da anterior"
      >
        <span aria-hidden>▼</span> caindo <span className="font-normal opacity-80">{text}</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-hover px-2 py-0.5 text-[11px] font-semibold text-text-secondary"
      title="Estável: a diferença entre as metades é pequena"
    >
      <span aria-hidden>—</span> estável
    </span>
  );
}

function Sparkline({ s, labels }: { s: TrendSeries; labels: string[] }) {
  const [min, max] = range(s.kind, s.values);
  const n = s.values.length;
  const baseline = H - PAD_BOTTOM;
  const x = (i: number) => PAD_X + (i * (W - 2 * PAD_X)) / Math.max(1, n - 1);
  const y = (v: number) =>
    baseline - ((v - min) / Math.max(1e-9, max - min)) * (baseline - PAD_TOP);

  const segments: { i: number; v: number }[][] = [];
  s.values.forEach((v, i) => {
    if (v === null) return;
    const current = segments[segments.length - 1];
    if (current && current[current.length - 1].i === i - 1) current.push({ i, v });
    else segments.push([{ i, v }]);
  });

  const lastIndex = s.values.reduce((last, v, i) => (v === null ? last : i), -1);
  // A cor da série entra como `color` e tudo dentro usa currentColor: o acento
  // vem da classe, a cor do negócio vem do estilo.
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`h-14 w-full ${s.color ? "" : "text-accent"}`}
      style={s.color ? { color: s.color } : undefined}
      role="img"
      aria-label={`${s.name}, período a período.`}
    >
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={baseline}
        y2={baseline}
        strokeWidth={1}
        className="stroke-border"
      />
      {segments.map((seg) => {
        const line = seg.map((p) => `${x(p.i)},${y(p.v)}`).join(" ");
        const area = `M${x(seg[0].i)},${baseline} L${line.replace(/ /g, " L")} L${x(seg[seg.length - 1].i)},${baseline} Z`;
        return (
          <g key={seg[0].i}>
            {seg.length > 1 && (
              <>
                <path d={area} fill="currentColor" fillOpacity={0.12} />
                <polyline
                  points={line}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            )}
          </g>
        );
      })}
      {s.values.map((v, i) =>
        v === null ? null : (
          <g key={i}>
            <title>{`${labels[i]} · ${formatValue(s.kind, v)}`}</title>
            <circle cx={x(i)} cy={y(v)} r={7} fill="transparent" />
            {i === lastIndex ? (
              <circle
                cx={x(i)}
                cy={y(v)}
                r={4}
                fill="currentColor"
                strokeWidth={2}
                className="stroke-surface"
              />
            ) : (
              <circle cx={x(i)} cy={y(v)} r={2} fill="currentColor" />
            )}
          </g>
        ),
      )}
    </svg>
  );
}

function TrendTile({
  s,
  labels,
  periodNoun,
}: {
  s: TrendSeries;
  labels: string[];
  periodNoun: string;
}) {
  const lastValue = [...s.values].reverse().find((v) => v !== null) ?? null;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 p-3">
      <div className="flex min-w-0 items-center gap-1.5">
        {s.color && (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: s.color }}
            aria-hidden
          />
        )}
        <span className="truncate text-sm font-medium text-text-primary" title={s.name}>
          {s.name}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold leading-tight text-text-primary">
            {lastValue === null ? "—" : formatValue(s.kind, lastValue)}
          </span>
          <span className="text-xs text-text-secondary">
            {lastValue === null ? "sem registro" : unitHint(s.kind, periodNoun)}
          </span>
        </div>
        <Verdict s={s} />
      </div>

      <Sparkline s={s} labels={labels} />
      <div className="flex justify-between text-[10px] text-text-secondary opacity-80">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

export function TrendsPanel({
  trends,
  periodNoun,
  subtitle,
}: {
  trends: Trends;
  /** "a semana" ou "o mês": completa "feito n…" → "feito na semana". */
  periodNoun: "a semana" | "o mês";
  subtitle: string;
}) {
  const labels = trends.buckets.map((b) => b.label);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Avançando ou caindo?</h2>
        <p className="text-xs text-text-secondary">{subtitle}</p>
      </div>

      {trends.groups.map((group) => (
        <Card key={group.key}>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">{group.title}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.series.map((s) => (
              <TrendTile key={s.key} s={s} labels={labels} periodNoun={periodNoun} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
