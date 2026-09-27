import { Topbar } from "@/components/layout/Topbar";
import { Card, CardTitle } from "@/components/ui";
import { EspiritualSubNav } from "@/components/modules/espiritual/EspiritualSubNav";
import { WheelChart } from "@/components/modules/espiritual/WheelChart";
import { MoonList } from "@/components/modules/espiritual/MoonList";
import { daysAwayLabel } from "@/components/modules/espiritual/MoonCard";
import { moonEventsBetween, formatTimeBR } from "@/lib/astros";
import { wheelAhead } from "@/lib/espiritual-shared";
import { cn, formatDateLongBR, todayUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Quantos meses de lua a tela mostra adiante. */
const MOON_MONTHS = 4;

export default async function RodaDoAnoPage() {
  const today = todayUtc();
  const ahead = wheelAhead(today);
  const next = ahead[0];

  const moons = moonEventsBetween(
    today,
    new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + MOON_MONTHS, today.getUTCDate()),
    ),
  );

  return (
    <>
      <Topbar title="Roda do ano" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <EspiritualSubNav />

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-6">
          <Card className="flex flex-col items-center gap-3">
            <WheelChart ahead={ahead} today={today} />
            <p className="text-center text-xs text-text-secondary">
              Datas do hemisfério sul — o sabbath acompanha a estação daqui, não a
              dos livros do norte. Solstícios e equinócios são calculados; os
              quatro do fogo têm data fixa.
            </p>
          </Card>

          <Card className="flex flex-col gap-3">
            <CardTitle>Uma volta inteira, a partir de hoje</CardTitle>

            <ol className="flex flex-col">
              {ahead.map((sabbat) => {
                const isNext = sabbat.key === next.key;

                return (
                  <li
                    key={`${sabbat.key}-${sabbat.date.toISOString()}`}
                    className={cn(
                      "border-b border-border/60 py-3 last:border-0",
                      isNext && "-mx-2 rounded-lg bg-accent/5 px-2",
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          isNext ? "text-accent" : "text-text-primary",
                        )}
                      >
                        {sabbat.name}
                        {sabbat.alsoKnownAs && (
                          <span className="font-normal text-text-secondary">
                            {" "}
                            · {sabbat.alsoKnownAs}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {daysAwayLabel(sabbat.date, today)}
                      </p>
                    </div>

                    <p className="text-xs text-text-secondary">
                      {formatDateLongBR(sabbat.date)}
                      {sabbat.at && ` · ${formatTimeBR(sabbat.at)}`}
                      {sabbat.nightInto && ` · a noite entra em ${sabbat.nightInto}`}
                    </p>

                    <p className="mt-1 text-sm text-text-primary">{sabbat.season}</p>
                    <p className="text-sm text-text-secondary">{sabbat.work}</p>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <Card className="flex flex-col gap-3">
          <CardTitle>Esbats — luas novas e cheias</CardTitle>
          <p className="text-xs text-text-secondary">
            Os próximos {MOON_MONTHS} meses, com a hora exata no fuso de São Paulo.
          </p>
          <MoonList events={moons} today={today} />
        </Card>
      </main>
    </>
  );
}
