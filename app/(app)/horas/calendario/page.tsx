import { getAllCategories, getPlannedBlocksForRange } from "@/lib/time-tracking";
import { daysForView, type CalendarViewMode } from "@/lib/time-tracking-shared";
import { getWeekStart } from "@/lib/cardapio";
import { parseDateOnly, toDateInputValue, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { CalendarNav } from "@/components/modules/horas/CalendarNav";
import { TimeGridCalendar } from "@/components/modules/horas/TimeGridCalendar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ view?: string; data?: string }>;

function parseView(value: string | undefined): CalendarViewMode {
  return value === "dia" || value === "3dias" ? value : "semana";
}

export default async function HorasCalendarioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const view = parseView(params.view);
  const chosen = params.data ? parseDateOnly(params.data) : null;
  const anchor = chosen ?? todayUtc();
  // Só a semana normaliza pra segunda — dia e 3 dias começam exatamente na
  // data escolhida, senão "próximo" nunca chegaria no dia certo.
  const rangeStart = view === "semana" ? getWeekStart(anchor) : anchor;

  const [categories, days] = await Promise.all([
    getAllCategories(),
    getPlannedBlocksForRange(rangeStart, daysForView(view)),
  ]);

  const activeCategories = categories.filter((c) => c.active);

  return (
    <>
      <Topbar title="Calendário — Controle de horas" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:space-y-6 md:px-8 md:py-8">
        <CalendarNav view={view} rangeStart={rangeStart.toISOString()} />

        <Card>
          <p className="mb-3 text-xs text-text-secondary">
            Clique num horário vazio pra criar um bloco, ou num bloco pra editar.
          </p>
          <TimeGridCalendar
            days={days}
            categories={activeCategories}
            todayDate={toDateInputValue(todayUtc())}
          />
        </Card>
      </main>
    </>
  );
}
