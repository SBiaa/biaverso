import { prisma } from "@/lib/prisma";
import { getWeekStart } from "@/lib/cardapio";
import { addUtcDays, getMonthRange, todayUtc } from "@/lib/utils";
import { blockLabels, moodScale } from "@/lib/labels";

export function getWeekRange(date: Date) {
  const weekStart = getWeekStart(date);
  return { weekStart, weekEnd: addUtcDays(weekStart, 6) };
}

export function getQuarter(month: number) {
  return Math.ceil(month / 3);
}

// Os três usam upsert na unique correspondente: o findFirst + create anterior
// deixava duas abas (ou um prefetch concorrente) criarem avaliações duplicadas
// para o mesmo período.

export async function getOrCreateQuarterReview(quarter: number, year: number) {
  return prisma.quarterReview.upsert({
    where: { quarter_year: { quarter, year } },
    create: { quarter, year },
    update: {},
  });
}

export async function getOrCreateMonthReview(month: number, year: number) {
  const quarterReview = await getOrCreateQuarterReview(getQuarter(month), year);

  return prisma.monthReview.upsert({
    where: { month_year: { month, year } },
    create: { month, year, quarterReviewId: quarterReview.id },
    // Reancora um mês que tenha ficado sem trimestre (ou no trimestre errado).
    update: { quarterReviewId: quarterReview.id },
  });
}

export async function getOrCreateWeekReview(weekStart: Date, weekEnd: Date) {
  const monthReview = await getOrCreateMonthReview(
    weekStart.getUTCMonth() + 1,
    weekStart.getUTCFullYear(),
  );

  return prisma.weekReview.upsert({
    where: { weekStart },
    create: { weekStart, weekEnd, monthReviewId: monthReview.id },
    update: { monthReviewId: monthReview.id },
  });
}

export async function getHabitWeekStats(weekStart: Date, weekEnd: Date) {
  const [habits, logs] = await Promise.all([
    prisma.habit.findMany({ where: { active: true } }),
    prisma.habitLog.findMany({
      where: { done: true, day: { date: { gte: weekStart, lte: weekEnd } } },
      select: { habitId: true },
    }),
  ]);

  const counts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.habitId] = (acc[log.habitId] ?? 0) + 1;
    return acc;
  }, {});

  return habits.map((h) => ({
    name: h.name,
    done: counts[h.id] ?? 0,
    total: 7,
  }));
}

export async function getRecentWeekReviews(limit = 12) {
  const weeks = await prisma.weekReview.findMany({
    orderBy: { weekStart: "desc" },
    take: limit,
    select: { id: true, weekStart: true, weekEnd: true, effectiveness: true },
  });
  return weeks.reverse();
}

export async function getBiggestBlockStats(limit = 8) {
  const weeks = await prisma.weekReview.findMany({
    where: { biggestBlock: { not: null } },
    orderBy: { weekStart: "desc" },
    take: limit,
    select: { biggestBlock: true },
  });

  const counts = weeks.reduce<Record<string, number>>((acc, w) => {
    const key = w.biggestBlock as string;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([block, count]) => ({ block, label: blockLabels[block] ?? block, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Resumo do mês vivido: hábitos, casa e humor, lidos direto dos dias.
//
// A revisão do mês era só o formulário — para escrever "destaques" ela tinha
// que lembrar de cabeça como foi. Isto põe os números do próprio /dia na
// frente do formulário. Tudo sai do que já está gravado: HabitLog, as cópias
// de rotina de cada dia e o humor/energia do Day. Nada é inventado para dias
// em que o app não foi aberto — eles simplesmente não têm linha.
// ---------------------------------------------------------------------------

export type MonthDayHouse = {
  /** Dia do mês, 1..31. */
  day: number;
  type: "NORMAL" | "FAXINA";
  done: number;
  total: number;
};

export type MonthDayMood = {
  day: number;
  mood: string;
  /** Posição na escala, 1 (pior) a 5 (melhor). */
  score: number;
};

export type HouseTypeSummary = {
  type: "NORMAL" | "FAXINA";
  days: number;
  done: number;
  total: number;
};

export async function getMonthSummary(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const { end } = getMonthRange(start);
  const today = todayUtc();
  // Dias futuros do mês corrente não contam: o Day pode existir (ela abriu o
  // /dia de amanhã para planejar) mas ainda não aconteceu.
  const lastCounted = end <= today ? end : addUtcDays(today, 1);
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const countedDays =
    lastCounted <= start
      ? 0
      : Math.round((lastCounted.getTime() - start.getTime()) / 86_400_000);

  const [days, habits] = await Promise.all([
    prisma.day.findMany({
      where: { date: { gte: start, lt: lastCounted } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        type: true,
        mood: true,
        energy: true,
        habits: { select: { habitId: true, done: true } },
        tasks: {
          where: { type: { in: ["ROTINA_NORMAL", "ROTINA_FAXINA"] } },
          select: { done: true },
        },
      },
    }),
    prisma.habit.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // --- Hábitos -------------------------------------------------------------
  const habitDone = new Map<string, number>();
  for (const day of days) {
    for (const log of day.habits) {
      if (log.done) habitDone.set(log.habitId, (habitDone.get(log.habitId) ?? 0) + 1);
    }
  }
  const habitStats = habits.map((h) => ({
    name: h.name,
    done: habitDone.get(h.id) ?? 0,
    total: countedDays,
  }));
  const habitsDoneTotal = habitStats.reduce((sum, h) => sum + h.done, 0);
  const habitsPossible = habits.length * countedDays;

  // --- Casa ----------------------------------------------------------------
  const house: MonthDayHouse[] = days
    .filter((d) => d.tasks.length > 0)
    .map((d) => ({
      day: d.date.getUTCDate(),
      type: d.type,
      done: d.tasks.filter((t) => t.done).length,
      total: d.tasks.length,
    }));

  const houseByType: HouseTypeSummary[] = (["NORMAL", "FAXINA"] as const).map((type) => {
    const ofType = house.filter((d) => d.type === type);
    return {
      type,
      days: ofType.length,
      done: ofType.reduce((sum, d) => sum + d.done, 0),
      total: ofType.reduce((sum, d) => sum + d.total, 0),
    };
  });

  // --- Humor e energia -----------------------------------------------------
  const moods: MonthDayMood[] = [];
  const moodCounts = moodScale.map(() => 0);
  for (const d of days) {
    if (!d.mood) continue;
    const index = (moodScale as readonly string[]).indexOf(d.mood);
    if (index < 0) continue;
    moodCounts[index] += 1;
    moods.push({ day: d.date.getUTCDate(), mood: d.mood, score: index + 1 });
  }
  const moodAverage =
    moods.length === 0
      ? null
      : moods.reduce((sum, m) => sum + m.score, 0) / moods.length;

  const energyCounts: Record<"ALTA" | "MEDIA" | "BAIXA", number> = {
    ALTA: 0,
    MEDIA: 0,
    BAIXA: 0,
  };
  for (const d of days) {
    if (d.energy) energyCounts[d.energy] += 1;
  }

  return {
    daysInMonth,
    /** Dias do mês que já aconteceram (ou o mês inteiro, se já passou). */
    countedDays,
    /** Dias em que o /dia foi aberto — os únicos com algo gravado. */
    loggedDays: days.length,
    habits: {
      items: habitStats,
      done: habitsDoneTotal,
      possible: habitsPossible,
    },
    house: { days: house, byType: houseByType },
    mood: { days: moods, counts: moodCounts, average: moodAverage },
    energy: energyCounts,
  };
}
