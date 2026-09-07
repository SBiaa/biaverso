import { prisma } from "@/lib/prisma";
import { moodScale } from "@/lib/labels";
import { addUtcDays, getMonthRange, monthNameBR } from "@/lib/utils";

/**
 * Tendências: cada coisa que ela acompanha, período a período, e se está
 * subindo ou caindo.
 *
 * O resumo do período diz "como foi"; isto diz "para onde está indo". Cada
 * série é um número por balde (uma semana, na avaliação semanal; um mês, na
 * mensal), e o veredito compara a média da metade recente com a da metade
 * anterior — um período bom depois de três ruins não vira "subindo", precisa
 * de um trecho.
 *
 * Balde sem registro fica nulo, não zero: uma semana sem abrir o app não é
 * uma semana em que ela não fez nada, é uma semana sem dado (mesma regra do
 * radar). Para negócios, zero é zero de verdade — o que foi entregue fica
 * gravado independente de abrir o /dia.
 */

export type TrendBucket = {
  start: Date;
  /** Exclusivo. */
  end: Date;
  /** Curto, para o eixo: "22/06" ou "Jun". */
  label: string;
};

export type TrendKind = "percent" | "mood" | "energy" | "count";

export type TrendDirection = "up" | "down" | "flat";

export type TrendSeries = {
  key: string;
  name: string;
  kind: TrendKind;
  /** Cor própria (negócios); sem isso a série usa o acento. */
  color?: string;
  /** Um valor por balde, do mais antigo ao mais recente. null = sem dado. */
  values: (number | null)[];
  /** null quando não há base para comparar (menos de quatro baldes com dado). */
  trend: { direction: TrendDirection; delta: number } | null;
};

export type TrendGroup = { key: string; title: string; series: TrendSeries[] };

export type Trends = { buckets: TrendBucket[]; groups: TrendGroup[] };

const pad2 = (n: number) => String(n).padStart(2, "0");

/** As `count` semanas que terminam na semana de `weekStart` (inclusive). */
export function weeklyBuckets(weekStart: Date, count = 12): TrendBucket[] {
  return Array.from({ length: count }, (_, i) => {
    const start = addUtcDays(weekStart, -7 * (count - 1 - i));
    return {
      start,
      end: addUtcDays(start, 7),
      label: `${pad2(start.getUTCDate())}/${pad2(start.getUTCMonth() + 1)}`,
    };
  });
}

/** Os `count` meses que terminam em `month/year` (inclusive). */
export function monthlyBuckets(month: number, year: number, count = 6): TrendBucket[] {
  return Array.from({ length: count }, (_, i) => {
    const ref = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
    const { start, end } = getMonthRange(ref);
    return { start, end, label: monthNameBR(ref.getUTCMonth() + 1).slice(0, 3) };
  });
}

/** A partir de quanto uma diferença deixa de ser "estável", por tipo. */
const FLAT_BAND: Record<TrendKind, number> = {
  percent: 3,
  mood: 0.2,
  energy: 0.15,
  count: 0.5,
};

function mean(values: number[]) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeTrend(values: (number | null)[], kind: TrendKind): TrendSeries["trend"] {
  // Só os baldes com dado entram na conta. Ela começou a registrar há poucas
  // semanas: se a comparação fosse sobre a janela fixa, a metade antiga
  // estaria vazia e tudo ficaria "sem base" por meses.
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 4) return null;

  const half = Math.floor(present.length / 2);
  const delta = mean(present.slice(half)) - mean(present.slice(0, half));
  const direction: TrendDirection =
    Math.abs(delta) <= FLAT_BAND[kind] ? "flat" : delta > 0 ? "up" : "down";
  return { direction, delta };
}

function series(
  key: string,
  name: string,
  kind: TrendKind,
  values: (number | null)[],
  color?: string,
): TrendSeries {
  return { key, name, kind, values, trend: computeTrend(values, kind), color };
}

const ENERGY_SCORE = { BAIXA: 1, MEDIA: 2, ALTA: 3 } as const;

export async function getTrends(buckets: TrendBucket[]): Promise<Trends> {
  const n = buckets.length;
  const windowStart = buckets[0].start;
  const windowEnd = buckets[n - 1].end;
  const window = { gte: windowStart, lt: windowEnd };

  // Baldes são contíguos e ordenados; o último que começa antes da data é o dela.
  const bucketOf = (date: Date) => {
    let index = 0;
    for (let i = 0; i < n; i++) if (buckets[i].start <= date) index = i;
    return index;
  };

  const [days, habits, businesses, posts, tasks, orders, dayTasks] = await Promise.all([
    prisma.day.findMany({
      where: { date: window },
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
    prisma.business.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.contentPost.findMany({
      where: { status: "PUBLICADO", completedAt: window },
      select: { businessId: true, completedAt: true },
    }),
    prisma.productionTask.findMany({
      where: { status: "CONCLUIDO", completedAt: window },
      select: { businessId: true, completedAt: true },
    }),
    prisma.order.findMany({
      where: { status: "ENTREGUE", completedAt: window },
      select: { businessId: true, completedAt: true },
    }),
    prisma.task.findMany({
      where: { done: true, completedAt: window, businessId: { not: null } },
      select: { businessId: true, completedAt: true },
    }),
  ]);

  // --- Acumuladores por balde ------------------------------------------------
  const zeros = () => Array.from({ length: n }, () => 0);
  const habitDone = new Map(habits.map((h) => [h.id, zeros()]));
  const habitTracked = new Map(habits.map((h) => [h.id, zeros()]));
  const house = {
    NORMAL: { done: zeros(), total: zeros() },
    FAXINA: { done: zeros(), total: zeros() },
  };
  const moodSum = zeros();
  const moodCount = zeros();
  const energySum = zeros();
  const energyCount = zeros();

  for (const day of days) {
    const b = bucketOf(day.date);

    for (const log of day.habits) {
      const tracked = habitTracked.get(log.habitId);
      if (!tracked) continue;
      tracked[b] += 1;
      if (log.done) habitDone.get(log.habitId)![b] += 1;
    }

    if (day.tasks.length > 0) {
      house[day.type].total[b] += day.tasks.length;
      house[day.type].done[b] += day.tasks.filter((t) => t.done).length;
    }

    const moodIndex = day.mood ? (moodScale as readonly string[]).indexOf(day.mood) : -1;
    if (moodIndex >= 0) {
      moodSum[b] += moodIndex + 1;
      moodCount[b] += 1;
    }
    if (day.energy) {
      energySum[b] += ENERGY_SCORE[day.energy];
      energyCount[b] += 1;
    }
  }

  const ratio = (done: number[], total: number[]) =>
    done.map((d, i) => (total[i] === 0 ? null : Math.round((d / total[i]) * 100)));
  const average = (sum: number[], count: number[]) =>
    sum.map((s, i) => (count[i] === 0 ? null : s / count[i]));

  // --- Hábitos ---------------------------------------------------------------
  const allHabitsDone = zeros();
  const allHabitsTracked = zeros();
  for (const h of habits) {
    habitDone.get(h.id)!.forEach((d, i) => (allHabitsDone[i] += d));
    habitTracked.get(h.id)!.forEach((t, i) => (allHabitsTracked[i] += t));
  }
  const habitGroup: TrendGroup = {
    key: "habits",
    title: "Hábitos",
    series:
      habits.length === 0
        ? []
        : [
            series("habits", "Todos os hábitos", "percent", ratio(allHabitsDone, allHabitsTracked)),
            ...habits.map((h) =>
              series(
                `habit:${h.id}`,
                h.name,
                "percent",
                ratio(habitDone.get(h.id)!, habitTracked.get(h.id)!),
              ),
            ),
          ],
  };

  // --- Casa ------------------------------------------------------------------
  const houseAllDone = house.NORMAL.done.map((d, i) => d + house.FAXINA.done[i]);
  const houseAllTotal = house.NORMAL.total.map((t, i) => t + house.FAXINA.total[i]);
  const houseGroup: TrendGroup = {
    key: "house",
    title: "Casa",
    series: [
      series("house", "Tarefas de casa", "percent", ratio(houseAllDone, houseAllTotal)),
      series("house:normal", "Dia normal", "percent", ratio(house.NORMAL.done, house.NORMAL.total)),
      series("house:faxina", "Dia de faxina", "percent", ratio(house.FAXINA.done, house.FAXINA.total)),
    ],
  };

  // --- Humor -----------------------------------------------------------------
  const moodGroup: TrendGroup = {
    key: "mood",
    title: "Como estou",
    series: [
      series("mood", "Humor", "mood", average(moodSum, moodCount)),
      series("energy", "Energia", "energy", average(energySum, energyCount)),
    ],
  };

  // --- Negócios --------------------------------------------------------------
  const businessDone = new Map(businesses.map((b) => [b.id, zeros()]));
  const bump = (businessId: string | null, at: Date | null) => {
    if (!businessId || !at) return;
    const row = businessDone.get(businessId);
    if (row) row[bucketOf(at)] += 1;
  };
  for (const p of posts) bump(p.businessId, p.completedAt);
  for (const t of tasks) bump(t.businessId, t.completedAt);
  for (const o of orders) bump(o.businessId, o.completedAt);
  for (const t of dayTasks) bump(t.businessId, t.completedAt);

  const businessGroup: TrendGroup = {
    key: "business",
    title: "Negócios",
    series: businesses.map((b) =>
      series(`business:${b.id}`, b.name, "count", businessDone.get(b.id)!, b.color),
    ),
  };

  const groups = [habitGroup, houseGroup, moodGroup, businessGroup].filter(
    (g) => g.series.length > 0,
  );

  // Corta o começo vazio da janela. Ela começou a registrar há pouco: doze
  // semanas com dado só nas últimas cinco viravam um gráfico com um rabinho
  // no canto direito e nada no resto. Fica no mínimo quatro baldes, para o
  // "recente vs. anterior" ter o que comparar — e a tendência já foi
  // calculada só sobre baldes com dado, então o corte não muda o veredito.
  const MIN_BUCKETS = 4;
  let first = n;
  for (const g of groups) {
    for (const s of g.series) {
      const idx = s.values.findIndex((v) => v !== null && (s.kind !== "count" || v > 0));
      if (idx >= 0 && idx < first) first = idx;
    }
  }
  const cut = Math.max(0, Math.min(first, n - MIN_BUCKETS));
  if (cut > 0) {
    for (const g of groups) for (const s of g.series) s.values = s.values.slice(cut);
  }

  return { buckets: buckets.slice(cut), groups };
}
