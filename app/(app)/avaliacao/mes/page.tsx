import Link from "next/link";
import { getMonthSummary, getOrCreateMonthReview, getQuarter } from "@/lib/avaliacao";
import { prisma } from "@/lib/prisma";
import { getBusinessPeriodSummary } from "@/lib/avaliacao-negocios";
import { getTrends, monthlyBuckets } from "@/lib/avaliacao-tendencias";
import { formatDateBR, getMonthRange, parseIntParam, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card, MonthPicker } from "@/components/ui";
import { AvaliacaoSubNav } from "@/components/modules/avaliacao/AvaliacaoSubNav";
import { MonthReviewForm } from "@/components/modules/avaliacao/MonthReviewForm";
import { MonthSummaryCards } from "@/components/modules/avaliacao/MonthSummaryCards";
import { BusinessPeriodSummaryCard } from "@/components/modules/avaliacao/BusinessPeriodSummary";
import { TrendsPanel } from "@/components/modules/avaliacao/TrendsPanel";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string; year?: string }>;

export default async function AvaliacaoMesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const month = parseIntParam(params.month, 1, 12) ?? today.getUTCMonth() + 1;
  const year = parseIntParam(params.year, 1970, 2999) ?? today.getUTCFullYear();

  const review = await getOrCreateMonthReview(month, year);
  const monthRange = getMonthRange(new Date(Date.UTC(year, month - 1, 1)));
  const [weeks, summary, businesses, trends] = await Promise.all([
    prisma.weekReview.findMany({
      where: { monthReviewId: review.id },
      orderBy: { weekStart: "asc" },
    }),
    getMonthSummary(month, year),
    getBusinessPeriodSummary(monthRange.start, monthRange.end),
    getTrends(monthlyBuckets(month, year)),
  ]);

  const quarterHref = `/avaliacao/trimestre?quarter=${getQuarter(month)}&year=${year}`;

  return (
    <>
      <Topbar width="narrow" title="Avaliação" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <AvaliacaoSubNav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthPicker month={month} year={year} />
          <Link href={quarterHref} className="-my-2 py-2 text-xs font-medium text-accent">
            Ver trimestre
          </Link>
        </div>

        {/* Como o mês foi de fato, antes do formulário: é isto que ela lê
            para escrever destaques e melhorias sem depender de memória. */}
        <MonthSummaryCards summary={summary} />
        <BusinessPeriodSummaryCard title="Negócios no mês" businesses={businesses} />

        <TrendsPanel
          trends={trends}
          periodNoun="o mês"
          subtitle="Este mês comparado com os 5 anteriores, mês a mês."
        />

        <Card>
          <h2 className="mb-3 text-base font-semibold text-text-primary">
            Semanas do mês
          </h2>
          {weeks.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhuma semana avaliada ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {weeks.map((week) => (
                <li key={week.id}>
                  <Link
                    href={`/avaliacao/semana?week=${week.weekStart.toISOString().slice(0, 10)}`}
                    className="flex items-center justify-between text-sm text-accent hover:underline"
                  >
                    <span>
                      {formatDateBR(week.weekStart)} – {formatDateBR(week.weekEnd)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <MonthReviewForm key={review.id} review={review} />
      </main>
    </>
  );
}
