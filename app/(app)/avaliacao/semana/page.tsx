import Link from "next/link";
import { getWeekRange, getHabitWeekStats, getOrCreateWeekReview } from "@/lib/avaliacao";
import { getBusinessPeriodSummary } from "@/lib/avaliacao-negocios";
import { getTrends, weeklyBuckets } from "@/lib/avaliacao-tendencias";
import { nextUtcDay, parseDateOnly, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { AvaliacaoSubNav } from "@/components/modules/avaliacao/AvaliacaoSubNav";
import { WeekPicker } from "@/components/modules/avaliacao/WeekPicker";
import { WeekReviewForm } from "@/components/modules/avaliacao/WeekReviewForm";
import { HabitProgressList } from "@/components/modules/avaliacao/HabitProgressList";
import { BusinessPeriodSummaryCard } from "@/components/modules/avaliacao/BusinessPeriodSummary";
import { TrendsPanel } from "@/components/modules/avaliacao/TrendsPanel";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ week?: string }>;

export default async function AvaliacaoSemanaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  // Param inválido cai para hoje em vez de derrubar a página.
  const referenceDate =
    (params.week ? parseDateOnly(params.week) : null) ?? todayUtc();
  const { weekStart, weekEnd } = getWeekRange(referenceDate);

  const [review, habitStats, businesses, trends] = await Promise.all([
    getOrCreateWeekReview(weekStart, weekEnd),
    getHabitWeekStats(weekStart, weekEnd),
    getBusinessPeriodSummary(weekStart, nextUtcDay(weekEnd)),
    getTrends(weeklyBuckets(weekStart)),
  ]);

  const monthHref = `/avaliacao/mes?month=${weekStart.getUTCMonth() + 1}&year=${weekStart.getUTCFullYear()}`;

  return (
    <>
      <Topbar width="narrow" title="Avaliação" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <AvaliacaoSubNav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <WeekPicker
            weekStart={weekStart.toISOString()}
            weekEnd={weekEnd.toISOString()}
          />
          <Link href={monthHref} className="-my-2 py-2 text-xs font-medium text-accent">
            Ver mês
          </Link>
        </div>

        <Card>
          <h2 className="mb-3 text-base font-semibold text-text-primary">
            Hábitos da semana
          </h2>
          <HabitProgressList items={habitStats} />
        </Card>

        <BusinessPeriodSummaryCard title="Negócios na semana" businesses={businesses} />

        <TrendsPanel
          trends={trends}
          periodNoun="a semana"
          subtitle="Esta semana comparada com as 11 anteriores, semana a semana."
        />

        <WeekReviewForm key={review.id} review={review} />
      </main>
    </>
  );
}
