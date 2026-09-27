import { Card, CardTitle } from "@/components/ui";
import { formatDateBR } from "@/lib/utils";
import { formatTimeBR, type MoonEvent, type MoonNow } from "@/lib/astros";
import {
  moonPhaseGlyph,
  moonPhaseLabels,
  moonPhaseWork,
} from "@/lib/espiritual-shared";

/** "hoje", "amanhã" ou "em 9 dias" — a distância como se fala, não em data. */
export function daysAwayLabel(target: Date, today: Date) {
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days < 0) return `há ${Math.abs(days)} dias`;
  return `em ${days} dias`;
}

/**
 * A lua de hoje e as duas próximas datas que importam.
 *
 * Nova e cheia, e nada de quartos: são essas duas que marcam esbat, e uma
 * lista com as quatro fases faria o card virar tabela.
 */
export function MoonCard({
  moon,
  nextNewMoon,
  nextFullMoon,
  today,
}: {
  moon: MoonNow;
  nextNewMoon: MoonEvent;
  nextFullMoon: MoonEvent;
  today: Date;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>A lua hoje</CardTitle>

      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-full bg-accent/10 text-2xl"
        >
          {moonPhaseGlyph[moon.phase]}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            {moonPhaseLabels[moon.phase]}
          </p>
          <p className="text-xs text-text-secondary">
            {Math.round(moon.illumination * 100)}% iluminada · {moon.age.toFixed(1)} dias
            de lunação
          </p>
        </div>
      </div>

      <p className="text-sm text-text-secondary">{moonPhaseWork[moon.phase]}</p>

      <dl className="flex flex-col gap-1.5 border-t border-border/60 pt-3 text-xs">
        {[
          { label: "Próxima lua nova", event: nextNewMoon },
          { label: "Próxima lua cheia", event: nextFullMoon },
        ].map(({ label, event }) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-text-secondary">{label}</dt>
            <dd className="text-right text-text-primary">
              {formatDateBR(event.date)}, {formatTimeBR(event.at)}{" "}
              <span className="text-text-secondary">
                ({daysAwayLabel(event.date, today)})
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
