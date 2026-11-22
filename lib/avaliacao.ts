import { prisma } from "@/lib/prisma";
import { getWeekStart } from "@/lib/cardapio";
import { addUtcDays, getMonthRange, todayUtc } from "@/lib/utils";
import { blockLabels, moodScale } from "@/lib/labels";
import { getOrCreateDay, materializeHabits, materializeRoutineTasks } from "@/lib/day";

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

/**
 * Hábitos da semana contados só nos dias conferidos. Um dia que ela não
 * conferiu pode ter ficado sem marcar por esquecimento — entra como "sem
 * dado", não como "não feito". O total de cada hábito é o número de dias
 * conferidos, não 7.
 */
export async function getHabitWeekStats(weekStart: Date, weekEnd: Date) {
  const [habits, logs] = await Promise.all([
    prisma.habit.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.habitLog.findMany({
      where: {
        day: { date: { gte: weekStart, lte: weekEnd }, reviewedAt: { not: null } },
      },
      select: { habitId: true, done: true },
    }),
  ]);

  const done = new Map<string, number>();
  const tracked = new Map<string, number>();
  for (const log of logs) {
    tracked.set(log.habitId, (tracked.get(log.habitId) ?? 0) + 1);
    if (log.done) done.set(log.habitId, (done.get(log.habitId) ?? 0) + 1);
  }

  return habits.map((h) => ({
    name: h.name,
    done: done.get(h.id) ?? 0,
    total: tracked.get(h.id) ?? 0,
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
        reviewedAt: true,
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

  // Hábitos e casa só dos dias conferidos: num dia não conferido, desmarcado
  // pode ser esquecimento. Humor e energia valem sempre — ou foram escolhidos
  // ou ficaram vazios, não há "não feito" para confundir.
  const reviewed = days.filter((d) => d.reviewedAt !== null);

  // --- Hábitos -------------------------------------------------------------
  const habitDone = new Map<string, number>();
  for (const day of reviewed) {
    for (const log of day.habits) {
      if (log.done) habitDone.set(log.habitId, (habitDone.get(log.habitId) ?? 0) + 1);
    }
  }
  const habitStats = habits.map((h) => ({
    name: h.name,
    done: habitDone.get(h.id) ?? 0,
    total: reviewed.length,
  }));
  const habitsDoneTotal = habitStats.reduce((sum, h) => sum + h.done, 0);
  const habitsPossible = habits.length * reviewed.length;

  // --- Casa ----------------------------------------------------------------
  const house: MonthDayHouse[] = reviewed
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
    /** Dias que ela conferiu — os únicos que entram em hábitos e casa. */
    reviewedDays: reviewed.length,
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

// ---------------------------------------------------------------------------
// Grade de completar a semana.
//
// Ela nem sempre volta ao /dia para marcar o que fez, e "não marcado" virava
// "não feito". A grade põe os sete dias lado a lado — hábitos e rotina da
// casa nas linhas — para marcar de uma vez no fim da semana e conferir cada
// dia. Só dia conferido entra nas contas (ver `reviewedAt` no Day).
// ---------------------------------------------------------------------------

export type WeekGridDay = {
  /** yyyy-mm-dd */
  date: string;
  dayId: string | null;
  reviewed: boolean;
  /** Ainda não aconteceu: não dá para marcar nem conferir. */
  future: boolean;
  type: "NORMAL" | "FAXINA";
};

export type WeekGridCell = { id: string; done: boolean } | null;

export type WeekGridRow = {
  key: string;
  name: string;
  /** "habit" marca HabitLog; "house" marca a tarefa de rotina do dia. */
  kind: "habit" | "house";
  /** Um por dia, segunda a domingo. null = o item não existe naquele dia. */
  cells: WeekGridCell[];
};

export async function getWeekGrid(weekStart: Date) {
  const today = todayUtc();
  const dates = Array.from({ length: 7 }, (_, i) => addUtcDays(weekStart, i));

  // Abre os dias que já aconteceram e copia hábitos e rotina, como o /dia faz.
  // Sem isso, um dia em que ela não abriu o app não teria o que marcar.
  for (const date of dates) {
    if (date > today) continue;
    const day = await getOrCreateDay(date);
    await materializeRoutineTasks(day);
    await materializeHabits(day);
  }

  const [days, habits, templates] = await Promise.all([
    prisma.day.findMany({
      where: { date: { gte: dates[0], lte: dates[6] } },
      select: {
        id: true,
        date: true,
        type: true,
        reviewedAt: true,
        habits: { select: { id: true, habitId: true, done: true } },
        tasks: {
          where: { type: { in: ["ROTINA_NORMAL", "ROTINA_FAXINA"] } },
          select: { id: true, title: true, done: true, templateId: true, type: true, order: true },
        },
      },
    }),
    prisma.habit.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { dayId: null, type: { in: ["ROTINA_NORMAL", "ROTINA_FAXINA"] } },
      select: { id: true, title: true },
    }),
  ]);

  const byDate = new Map(days.map((d) => [d.date.getTime(), d]));
  const columns = dates.map((date) => byDate.get(date.getTime()) ?? null);

  const gridDays: WeekGridDay[] = dates.map((date, i) => ({
    date: date.toISOString().slice(0, 10),
    dayId: columns[i]?.id ?? null,
    reviewed: Boolean(columns[i]?.reviewedAt),
    future: date > today,
    type: columns[i]?.type ?? "NORMAL",
  }));

  const habitRows: WeekGridRow[] = habits.map((h) => ({
    key: `habit:${h.id}`,
    name: h.name,
    kind: "habit",
    cells: columns.map((day) => {
      const log = day?.habits.find((l) => l.habitId === h.id);
      return log ? { id: log.id, done: log.done } : null;
    }),
  }));

  // Uma linha por item da rotina, juntando os dias pelo template. O nome vem do
  // template atual (ela pode ter renomeado); cópia antiga sem template vale pelo título.
  const templateName = new Map(templates.map((t) => [t.id, t.title]));
  const houseOrder: { key: string; name: string; rank: number }[] = [];
  for (const day of columns) {
    for (const t of day?.tasks ?? []) {
      const key = `house:${t.templateId ?? t.title}`;
      if (houseOrder.some((r) => r.key === key)) continue;
      houseOrder.push({
        key,
        name: (t.templateId && templateName.get(t.templateId)) || t.title,
        rank: (t.type === "ROTINA_FAXINA" ? 10_000 : 0) + t.order,
      });
    }
  }
  houseOrder.sort((a, b) => a.rank - b.rank);

  const houseRows: WeekGridRow[] = houseOrder.map((r) => ({
    key: r.key,
    name: r.name,
    kind: "house",
    cells: columns.map((day) => {
      const t = day?.tasks.find((x) => `house:${x.templateId ?? x.title}` === r.key);
      return t ? { id: t.id, done: t.done } : null;
    }),
  }));

  return { days: gridDays, habits: habitRows, house: houseRows };
}

/** Metas metrificadas encerradas no intervalo [start, end), com o pilar. */
export async function getClosedMeasuredGoals(start: Date, end: Date) {
  const goals = await prisma.measuredGoal.findMany({
    where: { closedAt: { gte: start, lt: end } },
    orderBy: { closedAt: "asc" },
    include: { conceptualGoal: { select: { pillar: true } } },
  });

  return goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    target: goal.target,
    targetValue: goal.targetValue,
    currentValue: goal.currentValue,
    unit: goal.unit,
    status: goal.status,
    progress: goal.progress,
    lesson: goal.lesson,
    closedAt: goal.closedAt!,
    pillar: {
      id: goal.conceptualGoal.pillar.id,
      name: goal.conceptualGoal.pillar.name,
      color: goal.conceptualGoal.pillar.color,
      icon: goal.conceptualGoal.pillar.icon,
    },
  }));
}

export type ClosedMeasuredGoal = Awaited<ReturnType<typeof getClosedMeasuredGoals>>[number];
