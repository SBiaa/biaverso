import Link from "next/link";
import { getOrCreateDay } from "@/lib/day";
import { getAllCategories, getDayTimeTracking, getRunningEntry } from "@/lib/time-tracking";
import { instantToMinutes } from "@/lib/time-tracking-shared";
import { parseDateOnly, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardTitle } from "@/components/ui";
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
      <main
        key={day.id}
        className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:space-y-6 md:px-8 md:py-8"
      >
        <div>
          <DayPicker date={day.date.toISOString()} />
          <p className="text-sm text-text-secondary">
            O que virou trabalho, estudo, bruxaria e o resto do seu dia?
          </p>
        </div>

        <Card>
          <CardTitle className="mb-3">Cronômetro</CardTitle>
          <TimerWidget categories={activeCategories} initialRunning={runningEntry} />
        </Card>

        <Card>
          <CardTitle className="mb-3">Linha do tempo</CardTitle>
          <DayTimeline
            categories={categories}
            blocks={blocks}
            entries={entries}
            nowMinutes={nowMinutes}
          />
        </Card>

        <Card>
          <CardTitle className="mb-3">Resumo do dia</CardTitle>
          <DailySummary categories={categories} entries={entries} />
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <CardTitle>Blocos planejados</CardTitle>
            <Link href="/horas/calendario" className="text-xs font-medium text-accent hover:underline">
              Ver calendário
            </Link>
          </div>
          <TimeBlockPlanner dayId={day.id} categories={activeCategories} blocks={blocks} />
        </Card>

        <Card>
          <CardTitle className="mb-3">Registros do dia</CardTitle>
          <TimeEntryList dayId={day.id} categories={activeCategories} entries={entries} />
        </Card>

        <Card>
          <CardTitle className="mb-3">Categorias</CardTitle>
          <CategoryManager initialItems={categories} />
        </Card>
      </main>
    </>
  );
}
