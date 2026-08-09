import { prisma } from "@/lib/prisma";
import { getWeekStart } from "@/lib/cardapio";
import { getMonthRange, startOfToday } from "@/lib/utils";
import { blockLabels } from "@/lib/labels";

export function getWeekRange(date: Date) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return { weekStart, weekEnd };
}

export function getQuarter(month: number) {
  return Math.ceil(month / 3);
}

export async function getOrCreateQuarterReview(quarter: number, year: number) {
  const existing = await prisma.quarterReview.findFirst({
    where: { quarter, year },
  });
  if (existing) return existing;
  return prisma.quarterReview.create({ data: { quarter, year } });
}

export async function getOrCreateMonthReview(month: number, year: number) {
  const quarterReview = await getOrCreateQuarterReview(getQuarter(month), year);

  const existing = await prisma.monthReview.findFirst({
    where: { month, year },
  });
  if (existing) {
    if (existing.quarterReviewId !== quarterReview.id) {
      return prisma.monthReview.update({
        where: { id: existing.id },
        data: { quarterReviewId: quarterReview.id },
      });
    }
    return existing;
  }
  return prisma.monthReview.create({
    data: { month, year, quarterReviewId: quarterReview.id },
  });
}

export async function getOrCreateWeekReview(weekStart: Date, weekEnd: Date) {
  const monthReview = await getOrCreateMonthReview(
    weekStart.getMonth() + 1,
    weekStart.getFullYear(),
  );

  const existing = await prisma.weekReview.findFirst({
    where: { weekStart },
  });
  if (existing) {
    if (existing.monthReviewId !== monthReview.id) {
      return prisma.weekReview.update({
        where: { id: existing.id },
        data: { monthReviewId: monthReview.id },
      });
    }
    return existing;
  }
  return prisma.weekReview.create({
    data: { weekStart, weekEnd, monthReviewId: monthReview.id },
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
  const today = startOfToday();
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
