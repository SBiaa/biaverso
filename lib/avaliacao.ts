import { prisma } from "@/lib/prisma";
import { getWeekStart } from "@/lib/cardapio";
import { addUtcDays, getMonthRange, todayUtc } from "@/lib/utils";
import { blockLabels } from "@/lib/labels";

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

export async function getHabitMonthStats(date: Date) {
  const { start, end } = getMonthRange(date);
  const today = todayUtc();
  const isCurrentMonth = start <= today && today < end;
  const totalDays = isCurrentMonth
    ? Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1
    : Math.floor((end.getTime() - start.getTime()) / 86_400_000);

  const [habits, logs] = await Promise.all([
    prisma.habit.findMany({ where: { active: true } }),
    prisma.habitLog.findMany({
      where: { done: true, day: { date: { gte: start, lt: end } } },
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
    total: totalDays,
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
