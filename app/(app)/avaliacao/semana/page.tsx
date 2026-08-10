import Link from "next/link";
import { getWeekRange, getHabitWeekStats, getOrCreateWeekReview } from "@/lib/avaliacao";
import { parseDateOnly, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { AvaliacaoSubNav } from "@/components/modules/avaliacao/AvaliacaoSubNav";
import { WeekPicker } from "@/components/modules/avaliacao/WeekPicker";
import { WeekReviewForm } from "@/components/modules/avaliacao/WeekReviewForm";
import { HabitProgressList } from "@/components/modules/avaliacao/HabitProgressList";

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

  const [review, habitStats] = await Promise.all([
    getOrCreateWeekReview(weekStart, weekEnd),
    getHabitWeekStats(weekStart, weekEnd),
  ]);

  const monthHref = `/avaliacao/mes?month=${weekStart.getUTCMonth() + 1}&year=${weekStart.getUTCFullYear()}`;

  return (
    <>
      <Topbar title="Avaliação" />
      <main className="flex-1 space-y-4 p-4 md:mx-auto md:max-w-[800px] md:p-6">
        <AvaliacaoSubNav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <WeekPicker
            weekStart={weekStart.toISOString()}
            weekEnd={weekEnd.toISOString()}
          />
          <Link href={monthHref} className="text-xs font-medium text-accent">
            Ver mês
          </Link>
        </div>

        <Card>
          <h2 className="mb-3 text-base font-semibold text-text-primary">
            Hábitos da semana
          </h2>
          <HabitProgressList items={habitStats} />
        </Card>

        <WeekReviewForm review={review} />
      </main>
    </>
  );
}
