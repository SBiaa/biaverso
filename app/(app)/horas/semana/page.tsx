import { getAllCategories, getWeekPlannedBlocks } from "@/lib/time-tracking";
import { getWeekStart } from "@/lib/cardapio";
import { parseDateOnly, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardTitle } from "@/components/ui";
import { WeekPicker } from "@/components/modules/horas/WeekPicker";
import { TimeBlockWeekGrid } from "@/components/modules/horas/TimeBlockWeekGrid";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ semana?: string }>;

export default async function HorasSemanaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  // Semana inválida na URL cai na de hoje. `getWeekStart` normaliza qualquer
  // dia para a segunda, então um link no meio da semana também funciona.
  const chosen = params.semana ? parseDateOnly(params.semana) : null;
  const weekStart = getWeekStart(chosen ?? todayUtc());
  const isCurrentWeek = weekStart.getTime() === getWeekStart(todayUtc()).getTime();

  const [categories, days] = await Promise.all([
    getAllCategories(),
    getWeekPlannedBlocks(weekStart),
  ]);

  const activeCategories = categories.filter((c) => c.active);

  return (
    <>
      <Topbar title="Semana — Controle de horas" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:space-y-6 md:px-8 md:py-8">
        <WeekPicker weekStart={weekStart.toISOString()} isCurrentWeek={isCurrentWeek} />

        <Card>
          <CardTitle className="mb-3">Blocos planejados da semana</CardTitle>
          <p className="mb-3 text-xs text-text-secondary">
            Almoço, estudo e o resto do que se repete — clique no dia pra ver o dia inteiro.
          </p>
          <TimeBlockWeekGrid
            weekStart={weekStart.toISOString()}
            days={days}
            categories={activeCategories}
          />
        </Card>
      </main>
    </>
  );
}
