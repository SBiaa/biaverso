import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Flame, GraduationCap, Hourglass } from "lucide-react";
import { Card, CardTitle } from "@/components/ui";
import type { StudyStats } from "@/lib/study-stats";
import { cn, formatDateBR } from "@/lib/utils";

/** Rosca de progresso em SVG: sem biblioteca de gráfico, e a cor segue o tema. */
function Donut({ done, total }: { done: number; total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : done / total;
  return (
    <div className="relative size-36 shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="size-full -rotate-90"
        role="img"
        aria-label={`${Math.round(pct * 100)}% das aulas feitas`}
      >
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-hover" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          className="stroke-accent transition-all"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums text-text-primary">
          {Math.round(pct * 100)}%
        </span>
        <span className="text-xs text-text-secondary">concluído</span>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-hover/60 px-3 py-2.5">
      <span className="text-accent">{icon}</span>
      <div>
        <p className="text-lg font-semibold leading-tight tabular-nums text-text-primary">{value}</p>
        <p className="text-xs text-text-secondary">{label}</p>
      </div>
    </div>
  );
}

export function StudyOverview({ stats }: { stats: StudyStats }) {
  const missing = stats.lessonsTotal - stats.lessonsDone;
  const max = Math.max(1, ...stats.activity.map((a) => a.count));
  const inProgress = stats.courses.filter((c) => c.done < c.total);
  const finished = stats.courses.length - inProgress.length;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-6">
      <Card className="flex flex-col gap-5">
        <CardTitle>Visão geral</CardTitle>
        <div className="flex flex-wrap items-center gap-6">
          <Donut done={stats.lessonsDone} total={stats.lessonsTotal} />
          <div className="grid min-w-56 flex-1 grid-cols-2 gap-2">
            <Stat icon={<CheckCircle2 size={20} />} label="aulas assistidas" value={stats.lessonsDone} />
            <Stat icon={<Hourglass size={20} />} label="aulas que faltam" value={missing} />
            <Stat
              icon={<GraduationCap size={20} />}
              label={`cursos em andamento (de ${stats.coursesTotal})`}
              value={stats.coursesStudying}
            />
            <Stat
              icon={<Flame size={20} />}
              label={stats.streak === 1 ? "dia seguido" : "dias seguidos"}
              value={stats.streak}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-text-secondary">Aulas feitas nos últimos 14 dias</p>
          <div className="flex h-24 items-end gap-1" role="img" aria-label="Aulas feitas por dia">
            {stats.activity.map((a, i) => (
              <div key={a.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  title={`Dia ${a.label}: ${a.count} ${a.count === 1 ? "aula" : "aulas"}`}
                  className={cn("w-full rounded-t", a.count ? "bg-accent" : "bg-hover")}
                  style={{ height: a.count ? `${Math.max(10, (a.count / max) * 100)}%` : "4%" }}
                />
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    i === stats.activity.length - 1
                      ? "font-semibold text-text-primary"
                      : "text-text-secondary",
                  )}
                >
                  {a.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4 lg:gap-6">
        <Card className="flex flex-col gap-3">
          <CardTitle>Para hoje</CardTitle>
          {stats.today.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nada agendado para hoje. Quando marcar uma data numa aula, ela aparece aqui.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border/60">
              {stats.today.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/conhecimento/curso/${l.courseId}?aula=${l.id}`}
                    className="flex items-center justify-between gap-3 py-2 hover:bg-hover"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text-primary">
                        {l.title}
                      </span>
                      <span className="block truncate text-xs text-text-secondary">
                        {l.courseTitle}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        l.late ? "font-medium text-danger" : "text-text-secondary",
                      )}
                    >
                      {l.late ? `atrasada · ${formatDateBR(new Date(l.scheduledDate))}` : "hoje"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <CardTitle>Cursos</CardTitle>
          {stats.courses.length === 0 ? (
            <p className="text-sm text-text-secondary">Nenhum curso com aulas ainda.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {inProgress.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link href={`/conhecimento/curso/${c.id}`} className="block hover:opacity-80">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium text-text-primary">
                        {c.areaEmoji} {c.title}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-text-secondary">
                        {c.done}/{c.total} · faltam {c.total - c.done}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hover">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(c.done / c.total) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
              {finished > 0 && (
                <li className="text-xs text-text-secondary">
                  + {finished} {finished === 1 ? "curso concluído" : "cursos concluídos"}
                </li>
              )}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
