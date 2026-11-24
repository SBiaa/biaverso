import { prisma } from "@/lib/prisma";
import { getMonthRange, nextUtcDay, todayUtc } from "@/lib/utils";
import type { CycleFlow, CycleMood, CycleSymptom } from "@/app/generated/prisma/enums";
import {
  calendarDayKind,
  cycleNow,
  derivePeriods,
  futurePredictions,
  toCycleNowView,
  type CalendarDayView,
  type CycleLogView,
  type CycleNowView,
  type PeriodView,
} from "@/lib/ciclo-shared";

// Server-only: este arquivo importa "@/lib/prisma", então nunca pode ser
// importado de um componente "use client" — use "@/lib/ciclo-shared".
export * from "@/lib/ciclo-shared";

type CycleLogRow = {
  date: Date;
  flow: CycleFlow | null;
  symptoms: CycleSymptom[];
  mood: CycleMood | null;
  notes: string | null;
};

function toLogView(log: CycleLogRow): CycleLogView {
  return {
    date: log.date.toISOString(),
    flow: log.flow,
    symptoms: log.symptoms,
    mood: log.mood,
    notes: log.notes,
  };
}

/** Todos os dias com fluxo registrado, em ordem — a base de todo o resto. */
async function getAllPeriods() {
  const logs = await prisma.cycleLog.findMany({
    where: { flow: { not: null } },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  return derivePeriods(logs.map((l) => l.date));
}

/** O painel principal: onde está o ciclo hoje, e o que foi registrado hoje. */
export async function getCycleDashboard(today: Date = todayUtc()): Promise<{
  cycleNow: CycleNowView;
  todayLog: CycleLogView | null;
  recentPeriods: PeriodView[];
}> {
  const [periods, todayLog] = await Promise.all([
    getAllPeriods(),
    prisma.cycleLog.findUnique({ where: { date: today } }),
  ]);

  const now = cycleNow(periods, today);
  const recentPeriods = periods
    .slice(-6)
    .reverse()
    .map((p) => ({
      start: p.start.toISOString(),
      end: p.end.toISOString(),
      length: p.length,
    }));

  return {
    cycleNow: toCycleNowView(now),
    todayLog: todayLog ? toLogView(todayLog) : null,
    recentPeriods,
  };
}

/** A grade do mês pedido: um dia por célula, já classificado para pintar. */
export async function getCycleCalendarMonth(
  month: number,
  year: number,
): Promise<CalendarDayView[]> {
  const today = todayUtc();
  const { start, end } = getMonthRange(new Date(Date.UTC(year, month - 1, 1)));

  const [periods, monthLogs] = await Promise.all([
    getAllPeriods(),
    prisma.cycleLog.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true, flow: true, symptoms: true, mood: true, notes: true },
    }),
  ]);

  const now = cycleNow(periods, today);
  // Previsões até um pouco além do fim do mês: a janela fértil de um ciclo que
  // começa no fim do mês transborda para os primeiros dias do mês seguinte.
  const predictions = futurePredictions(now, nextUtcDay(nextUtcDay(end)));

  const loggedFlowDates = new Set(
    monthLogs.filter((l) => l.flow !== null).map((l) => l.date.getTime()),
  );
  const logsByTime = new Map(monthLogs.map((l) => [l.date.getTime(), l]));

  const days: CalendarDayView[] = [];
  for (let d = new Date(start); d < end; d = nextUtcDay(d)) {
    const log = logsByTime.get(d.getTime());
    days.push({
      date: d.toISOString(),
      day: d.getUTCDate(),
      kind: calendarDayKind(d, loggedFlowDates, predictions),
      isToday: d.getTime() === today.getTime(),
      log: log ? toLogView(log) : null,
    });
  }

  return days;
}

type CycleLogInput = {
  date: Date;
  flow?: CycleFlow | null;
  symptoms?: CycleSymptom[];
  mood?: CycleMood | null;
  notes?: string | null;
};

/**
 * Grava (ou apaga) o registro do dia. Um dia sem fluxo, sem sintoma, sem humor
 * e sem nota não tem mais o que dizer — em vez de deixar uma linha vazia no
 * banco, o registro é removido, e o dia volta a ser "sem dado".
 */
export async function upsertCycleLog(input: CycleLogInput): Promise<CycleLogView | null> {
  const flow = input.flow ?? null;
  const symptoms = input.symptoms ?? [];
  const mood = input.mood ?? null;
  const notes = input.notes ?? null;

  const isEmpty = !flow && symptoms.length === 0 && !mood && !notes;

  if (isEmpty) {
    await prisma.cycleLog.deleteMany({ where: { date: input.date } });
    return null;
  }

  const saved = await prisma.cycleLog.upsert({
    where: { date: input.date },
    create: { date: input.date, flow, symptoms, mood, notes },
    update: { flow, symptoms, mood, notes },
  });

  return toLogView(saved);
}
