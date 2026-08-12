import { Suspense } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Droplets,
  ListChecks,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, StatCard, type BadgeOrigin } from "@/components/ui";
import { PillarHighlightCard } from "@/components/modules/visao/PillarHighlightCard";
import { SyncStatusIcon } from "@/components/modules/agenda/SyncStatusIcon";
import { HomeHabitList } from "@/components/modules/home/HomeHabitList";
import { HomeTaskList } from "@/components/modules/home/HomeTaskList";
import { RadarHomeNote } from "@/components/modules/radar/RadarHomeNote";
import { WaterTracker } from "@/components/modules/dia/WaterTracker";
import { getOrCreateDay } from "@/lib/day";
import { getWeekStart, weekdayIndex } from "@/lib/cardapio";
import { getUserSettings } from "@/lib/settings";
import {
  dayOfYear,
  formatCurrencyBRL,
  formatDateBR,
  getMonthRange,
  todayUtc,
} from "@/lib/utils";

const motivationalPhrases = [
  "Um dia de cada vez.",
  "Progresso, não perfeição.",
  "Pequenos passos também levam longe.",
  "Hoje é um bom dia para cuidar de mim.",
  "Constância vence intensidade.",
];

const mealTypeLabels: Record<string, string> = {
  CAFE_DA_MANHA: "Café",
  ALMOCO: "Almoço",
  JANTAR: "Janta",
  LANCHE: "Lanche",
};

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const date = todayUtc();

  // Antes era `findUnique`, e num dia ainda sem registro a home não tinha
  // `dayId` nenhum para pendurar a água. O upsert garante o Day de hoje.
  const today = await getOrCreateDay(date);

  const { start: monthStart, end: monthEnd } = getMonthRange(date);

  // `select` no lugar de `include`: as relações inteiras traziam a linha
  // completa de Recipe, Habit e Pillar para exibir um punhado de campos.
  const [day, mealPlans, entradas, saidas, pillars, settings] = await Promise.all([
    prisma.day.findUniqueOrThrow({
      where: { id: today.id },
      select: {
        id: true,
        events: {
          orderBy: { time: "asc" },
          select: { id: true, time: true, title: true, syncStatus: true },
        },
        tasks: {
          orderBy: { order: "asc" },
          select: { id: true, title: true, done: true, origin: true },
        },
        habits: {
          select: { id: true, done: true, habit: { select: { name: true } } },
        },
        waterLogs: { select: { id: true } },
        mealLogs: {
          select: { mealType: true, recipe: { select: { title: true } } },
        },
      },
    }),
    prisma.mealPlan.findMany({
      where: { weekStart: getWeekStart(date), dayOfWeek: weekdayIndex(date) },
      select: { mealType: true, recipe: { select: { title: true } } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "ENTRADA", date: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "SAIDA", date: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.pillar.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        conceptualGoals: {
          select: {
            measuredGoals: {
              where: { status: "EM_ANDAMENTO" },
              orderBy: { deadline: "asc" },
              select: { title: true, progress: true },
            },
          },
        },
      },
    }),
    getUserSettings(),
  ]);

  const saldo = (entradas._sum.amount ?? 0) - (saidas._sum.amount ?? 0);

  const pillarHighlight = pillars
    .map((pillar) => {
      const inProgress = pillar.conceptualGoals.flatMap((g) => g.measuredGoals);
      return {
        id: pillar.id,
        name: pillar.name,
        color: pillar.color,
        icon: pillar.icon,
        inProgressCount: inProgress.length,
        highlightGoal: inProgress[0]
          ? { title: inProgress[0].title, progress: inProgress[0].progress }
          : null,
      };
    })
    .filter((pillar) => pillar.inProgressCount > 0)
    .sort((a, b) => b.inProgressCount - a.inProgressCount)[0] ?? null;

  return { day, saldo, date, pillarHighlight, settings, mealPlans };
}

export default async function HomePage() {
  const { day, saldo, date, pillarHighlight, settings, mealPlans } = await getDashboardData();

  const events = day.events;
  const tasks = day.tasks.map((t) => ({ ...t, origin: t.origin as BadgeOrigin }));
  const habits = day.habits.map((h) => ({ id: h.id, name: h.habit.name, done: h.done }));
  const waterCount = day.waterLogs.length;
  const mealLogs = day.mealLogs;

  const habitsDone = habits.filter((h) => h.done).length;

  const meals = (["CAFE_DA_MANHA", "ALMOCO", "JANTAR"] as const).map((type) => {
    const log = mealLogs.find((m) => m.mealType === type);
    const plan = mealPlans.find((p) => p.mealType === type);
    return {
      type,
      title: log?.recipe?.title ?? plan?.recipe?.title ?? "—",
    };
  });

  const phrase =
    motivationalPhrases[dayOfYear(date) % motivationalPhrases.length];

  return (
    <>
      <Topbar title="Home" />

      {/* Desktop */}
      <main className="mx-auto hidden w-full max-w-[1800px] flex-1 flex-col gap-6 px-4 py-5 md:px-8 md:py-8 md:flex">
        {/* A frase do dia existia só no mobile, e era o único lugar do desktop
            com alguma voz — sem ela a home abria direto em quatro números. */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-serif text-xl italic text-text-secondary">
            {phrase}
          </p>
          <span className="text-sm text-text-secondary">
            {formatDateBR(date)}
          </span>
        </div>

        {/* Em Suspense para o radar (4 consultas) não segurar a Home inteira. */}
        <Suspense fallback={null}>
          <RadarHomeNote />
        </Suspense>

        {/* 4 colunas fixas espremiam "R$ 1.234,56" em ~115px entre 768 e
            1280px. Duas até lá, quatro quando há espaço de verdade. */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Eventos hoje"
            value={events.length}
            icon={<CalendarDays size={16} className="text-text-secondary" />}
          />
          <StatCard
            label="Hábitos"
            value={`${habitsDone}/${habits.length}`}
            icon={<ListChecks size={16} className="text-text-secondary" />}
          />
          <StatCard
            label="Água"
            value={`${waterCount}/${settings.waterGoal}`}
            icon={<Droplets size={16} className="text-text-secondary" />}
          />
          <StatCard
            label="Saldo do mês"
            value={formatCurrencyBRL(saldo)}
            icon={<Wallet size={16} className="text-text-secondary" />}
            valueClassName={saldo >= 0 ? "text-emerald-600" : "text-red-600"}
          />
        </div>

        {/* Agenda e Tarefas saem de uma coluna compartilhada para uma cada:
            num container de 1600px, duas colunas davam cards de 780px com uma
            lista de três linhas dentro. A terceira coluna junta os registros
            curtos do dia. */}
        <div className="grid flex-1 grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          <div className="flex flex-col gap-4 lg:gap-6">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Agenda de hoje
              </h2>
              {events.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nenhum evento para hoje.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {events.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-12 shrink-0 text-text-secondary">
                        {event.time ?? "—"}
                      </span>
                      <SyncStatusIcon status={event.syncStatus} />
                      <span className="text-text-primary">{event.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-4 lg:gap-6">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Tarefas de hoje
              </h2>
              <HomeTaskList items={tasks} />
            </Card>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-2 lg:gap-6 xl:col-span-1">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Hábitos do dia
              </h2>
              <div className="mb-4">
                <HomeHabitList items={habits} />
              </div>
              <WaterTracker
                dayId={day.id}
                initialCount={waterCount}
                settings={settings}
              />
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Cardápio de hoje
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {meals.map((meal) => (
                  <div key={meal.type} className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                      {mealTypeLabels[meal.type]}
                    </span>
                    <span className="text-sm text-text-primary">{meal.title}</span>
                  </div>
                ))}
              </div>
            </Card>

            <PillarHighlightCard pillar={pillarHighlight} />
          </div>
        </div>
      </main>

      {/* Mobile */}
      <main className="flex flex-1 flex-col gap-4 p-4 md:hidden">
        <p className="font-serif text-lg italic text-text-secondary">
          {phrase}
        </p>

        <Suspense fallback={null}>
          <RadarHomeNote />
        </Suspense>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-text-primary">
            Hoje, {formatDateBR(date)}
          </h2>
          {events.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhum evento para hoje.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {events.map((event) => (
                <li key={event.id} className="flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 text-text-secondary">
                    {event.time ?? "—"}
                  </span>
                  <SyncStatusIcon status={event.syncStatus} />
                  <span className="text-text-primary">{event.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Hábitos</h2>
            <span className="text-sm text-text-secondary">
              {habitsDone}/{habits.length}
            </span>
          </div>
          <HomeHabitList items={habits} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Tarefas de hoje
          </h2>
          <HomeTaskList items={tasks} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Água</h2>
          <WaterTracker
            dayId={day.id}
            initialCount={waterCount}
            settings={settings}
          />
        </Card>

        <Link
          href="/dia"
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-white"
        >
          Ver dia completo
        </Link>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Cardápio de hoje
          </h2>
          <div className="flex flex-col gap-2">
            {meals.map((meal) => (
              <div key={meal.type} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{mealTypeLabels[meal.type]}</span>
                <span className="text-text-primary">{meal.title}</span>
              </div>
            ))}
          </div>
        </Card>

        <PillarHighlightCard pillar={pillarHighlight} />
      </main>
    </>
  );
}
