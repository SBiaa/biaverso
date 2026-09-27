import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { cardColumns } from "@/components/layout/page-width";
import { AttentionBadge, Card, CardTitle, attentionFromDueDate } from "@/components/ui";
import { EspiritualSubNav } from "@/components/modules/espiritual/EspiritualSubNav";
import { MoonCard } from "@/components/modules/espiritual/MoonCard";
import { SabbatCard } from "@/components/modules/espiritual/SabbatCard";
import { getEspiritualOverview } from "@/lib/espiritual";
import {
  covenMeetingKindLabels,
  divinationMethodLabels,
  ritualKindLabels,
  studyKindLabels,
  studyStatusLabels,
} from "@/lib/espiritual-shared";
import { formatDateBR, parseDateOnly, todayUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EspiritualPage() {
  const today = todayUtc();
  const overview = await getEspiritualOverview(today);

  // Com prazo primeiro (o `getStudies` já ordena assim); o resto vem atrás sem
  // nenhuma urgência anunciada, que é o que "sem prazo" significa.
  const comPrazo = overview.openStudies.filter((s) => s.dueDate);
  const semPrazo = overview.openStudies.filter((s) => !s.dueDate);

  return (
    <>
      <Topbar title="Espiritual" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <EspiritualSubNav />

        <div className={cardColumns}>
          <SabbatCard
            sabbat={overview.sabbat.sabbat}
            daysAway={overview.sabbat.daysAway}
          />

          <MoonCard
            moon={overview.moon}
            nextNewMoon={overview.nextNewMoon}
            nextFullMoon={overview.nextFullMoon}
            today={today}
          />

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Próximos encontros</CardTitle>
              <Link href="/espiritual/coven" className="text-xs font-medium text-accent">
                ver todos
              </Link>
            </div>

            {overview.meetings.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Nenhum encontro marcado. O que for marcado aqui entra também na
                agenda.
              </p>
            ) : (
              <ul className="flex flex-col">
                {overview.meetings.map((meeting) => {
                  const date = parseDateOnly(meeting.date);
                  return (
                    <li
                      key={meeting.id}
                      className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-text-primary">
                          {meeting.title}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {covenMeetingKindLabels[meeting.kind] ?? meeting.kind}
                          {meeting.place && ` · ${meeting.place}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-text-secondary">
                        {date ? formatDateBR(date) : meeting.date}
                        {meeting.time && ` · ${meeting.time}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Textos e exercícios em aberto</CardTitle>
              <Link
                href="/espiritual/estudos"
                className="text-xs font-medium text-accent"
              >
                ver todos
              </Link>
            </div>

            {overview.openStudies.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Nada pendente. Quando a mestre passar um exercício, ele entra aqui
                com o prazo.
              </p>
            ) : (
              <ul className="flex flex-col">
                {[...comPrazo, ...semPrazo].map((study) => {
                  const due = study.dueDate ? parseDateOnly(study.dueDate) : null;
                  const level = attentionFromDueDate(due, today);

                  return (
                    <li
                      key={study.id}
                      className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-text-primary">
                          {study.title}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {studyKindLabels[study.kind] ?? study.kind} ·{" "}
                          {studyStatusLabels[study.status] ?? study.status}
                        </p>
                      </div>
                      {due ? (
                        <AttentionBadge level={level}>
                          {formatDateBR(due)}
                        </AttentionBadge>
                      ) : (
                        <span className="shrink-0 text-xs text-text-secondary">
                          sem prazo
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <CardTitle>Últimos registros</CardTitle>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-text-secondary">Diário</span>
                {overview.lastRitual ? (
                  <span className="min-w-0 truncate text-right text-text-primary">
                    {overview.lastRitual.title}{" "}
                    <span className="text-text-secondary">
                      ({ritualKindLabels[overview.lastRitual.kind]} ·{" "}
                      {formatDateBR(parseDateOnly(overview.lastRitual.date)!)})
                    </span>
                  </span>
                ) : (
                  <span className="text-text-secondary">nada ainda</span>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <span className="text-text-secondary">Tiragem</span>
                {overview.lastDivination ? (
                  <span className="min-w-0 truncate text-right text-text-primary">
                    {overview.lastDivination.question ?? "Sem pergunta"}{" "}
                    <span className="text-text-secondary">
                      ({divinationMethodLabels[overview.lastDivination.method]} ·{" "}
                      {formatDateBR(parseDateOnly(overview.lastDivination.date)!)})
                    </span>
                  </span>
                ) : (
                  <span className="text-text-secondary">nada ainda</span>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <span className="text-text-secondary">Altar</span>
                <span className="text-text-primary">
                  {overview.runningLow > 0
                    ? `${overview.runningLow} ${overview.runningLow === 1 ? "item acabando" : "itens acabando"}`
                    : "nada acabando"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-border/60 pt-3 text-xs font-medium text-accent">
              <Link href="/espiritual/rituais">Registrar ritual</Link>
              <Link href="/espiritual/tiragens">Registrar tiragem</Link>
              <Link href="/espiritual/altar">Ver o altar</Link>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
