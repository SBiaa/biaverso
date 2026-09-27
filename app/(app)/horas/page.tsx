import { getOrCreateDay } from "@/lib/day";
import { getAllCategories, getDayTimeTracking, getRunningEntry } from "@/lib/time-tracking";
import { instantToMinutes } from "@/lib/time-tracking-shared";
import { parseDateOnly, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { DayPicker } from "@/components/modules/dia/DayPicker";
import { TimerWidget } from "@/components/modules/horas/TimerWidget";
import { DayTimeline } from "@/components/modules/horas/DayTimeline";
import { TimeBlockPlanner } from "@/components/modules/horas/TimeBlockPlanner";
import { TimeEntryList } from "@/components/modules/horas/TimeEntryList";
import { DailySummary } from "@/components/modules/horas/DailySummary";
import { CategoryManager } from "@/components/modules/horas/CategoryManager";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ date?: string }>;

export default async function HorasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const date = (params.date ? parseDateOnly(params.date) : null) ?? today;
  const isToday = date.getTime() === today.getTime();

  const day = await getOrCreateDay(date);
  const [categories, { blocks, entries }, runningEntry] = await Promise.all([
    getAllCategories(),
    getDayTimeTracking(day.id),
    getRunningEntry(),
  ]);

  const activeCategories = categories.filter((c) => c.active);
  const nowMinutes = isToday ? instantToMinutes(new Date().toISOString()) : null;

  return (
    <>
      <Topbar title="Controle de horas" />
      <main key={day.id} className="flex-1 space-y-4 p-4 md:p-6 md:max-w-3xl">
        <div>
          <DayPicker date={day.date.toISOString()} />
          <p className="text-sm text-text-secondary">
            O que virou trabalho, estudo, bruxaria e o resto do seu dia?
          </p>
        </div>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Cronômetro</h2>
          <TimerWidget categories={activeCategories} initialRunning={runningEntry} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Linha do tempo</h2>
          <DayTimeline
            categories={categories}
            blocks={blocks}
            entries={entries}
            nowMinutes={nowMinutes}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Resumo do dia</h2>
          <DailySummary categories={categories} entries={entries} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Blocos planejados</h2>
          <TimeBlockPlanner dayId={day.id} categories={activeCategories} blocks={blocks} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Registros do dia</h2>
          <TimeEntryList dayId={day.id} categories={activeCategories} entries={entries} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Categorias</h2>
          <CategoryManager initialItems={categories} />
        </Card>
      </main>
    </>
  );
}
