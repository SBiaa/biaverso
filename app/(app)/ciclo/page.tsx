import { Topbar } from "@/components/layout/Topbar";
import { cardColumns } from "@/components/layout/page-width";
import { CycleStatusCard } from "@/components/modules/ciclo/CycleStatusCard";
import { TodayLogCard } from "@/components/modules/ciclo/TodayLogCard";
import { CycleCalendar } from "@/components/modules/ciclo/CycleCalendar";
import { PeriodHistory } from "@/components/modules/ciclo/PeriodHistory";
import { getCycleCalendarMonth, getCycleDashboard } from "@/lib/ciclo";
import { parseIntParam, todayUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string; year?: string }>;

export default async function CicloPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const month = parseIntParam(params.month, 1, 12) ?? today.getUTCMonth() + 1;
  const year = parseIntParam(params.year, 1970, 2999) ?? today.getUTCFullYear();

  const [{ cycleNow, todayLog, recentPeriods }, calendarDays] = await Promise.all([
    getCycleDashboard(today),
    getCycleCalendarMonth(month, year),
  ]);

  return (
    <>
      <Topbar title="Ciclo" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <CycleStatusCard cycleNow={cycleNow} />

        <div className={cardColumns}>
          <TodayLogCard date={today.toISOString()} log={todayLog} />
          <PeriodHistory periods={recentPeriods} />
        </div>

        <CycleCalendar key={`${year}-${month}`} month={month} year={year} days={calendarDays} />
      </main>
    </>
  );
}
