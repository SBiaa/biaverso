import { Suspense } from "react";
import Link from "next/link";
import { CalendarDays, Droplets, ListChecks, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { pageContainer } from "@/components/layout/page-width";
import {
  Card,
  CardTitle,
  StatCard,
  type BadgeOrigin,
} from "@/components/ui";
import { PillarHighlightCard } from "@/components/modules/visao/PillarHighlightCard";
import { goalProgress } from "@/lib/vision-shared";
import { SyncStatusIcon } from "@/components/modules/agenda/SyncStatusIcon";
import { HomeHabitList } from "@/components/modules/home/HomeHabitList";
import { HomeTaskList } from "@/components/modules/home/HomeTaskList";
import { QuickCaptureForm } from "@/components/modules/ideias/QuickCaptureForm";
import { RadarHomeNote } from "@/components/modules/radar/RadarHomeNote";
import { WaterTracker } from "@/components/modules/dia/WaterTracker";
import { getOrCreateDay } from "@/lib/day";
import { getWeekStart, weekdayIndex } from "@/lib/cardapio";
import { getUserSettings } from "@/lib/settings";
import {
  cn,
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
  const [day, mealPlans, entradas, saidas, pillars, settings, businesses] = await Promise.all([
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
              select: { title: true, progress: true, targetValue: true, currentValue: true },
            },
          },
        },
      },
    }),
    getUserSettings(),
    // Só para o destino da captura rápida de ideias.
    prisma.business.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
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
          ? { title: inProgress[0].title, progress: goalProgress(inProgress[0]) }
          : null,
      };
    })
    .filter((pillar) => pillar.inProgressCount > 0)
    .sort((a, b) => b.inProgressCount - a.inProgressCount)[0] ?? null;

  return { day, saldo, date, pillarHighlight, settings, mealPlans, businesses };
}

export default async function HomePage() {
  const { day, saldo, date, pillarHighlight, settings, mealPlans, businesses } =
    await getDashboardData();

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

      {/* Uma marcação só para celular e computador. Antes eram duas `<main>`
          inteiras (uma `hidden md:flex`, outra `md:hidden`), e cada mudança
          precisava ser feita duas vezes — as duas já tinham divergido em
          título, cards e ordem. */}
      <main
        className={cn(
          pageContainer("wide"),
          "flex flex-1 flex-col gap-4 py-5 md:gap-6 md:py-8",
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-serif text-lg italic text-text-secondary md:text-xl">
            {phrase}
          </p>
          <span className="text-sm text-text-secondary">
            {formatDateBR(date)}
          </span>
        </div>

        {/* Ideia boa aparece a qualquer hora e some rápido: o campo fica no
            topo da home para não depender de achar o menu antes. */}
        <QuickCaptureForm businesses={businesses} standalone />

        {/* Em Suspense para o radar (4 consultas) não segurar a Home inteira. */}
        <Suspense fallback={null}>
          <RadarHomeNote />
        </Suspense>

        {/* Só a partir do tablet: no celular hábitos e água já aparecem nos
            cards logo abaixo, e quatro números antes do conteúdo empurravam a
            agenda para fora da primeira tela.

            4 colunas fixas espremiam "R$ 1.234,56" em ~115px entre 768 e
            1280px. Duas até lá, quatro quando há espaço de verdade. */}
        <div className="hidden grid-cols-2 gap-4 md:grid xl:grid-cols-4">
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
            valueClassName={saldo >= 0 ? "text-success" : "text-danger"}
          />
        </div>

        {/* No desktop são três colunas: curto com curto (agenda e cardápio) de
            um lado, a lista longa no meio, hábitos e pilar do outro.

            Abaixo de `lg` as colunas viram `contents` — somem como caixa e os
            cards passam a ser filhos diretos desta pilha — e o `order-*` põe
            primeiro o que se faz no dia (agenda, hábitos, tarefas) e por último
            o que só se consulta. O `lg:order-none` desliga isso nas colunas. */}
        <div className="flex flex-1 flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 xl:grid-cols-3">
          <div className="contents lg:flex lg:flex-col lg:gap-6">
            <Card className="order-1 lg:order-none">
              <CardTitle className="mb-3">Agenda de hoje</CardTitle>
              {events.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nenhum evento para hoje.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
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

            <Card className="order-5 lg:order-none">
              <CardTitle className="mb-3">Cardápio de hoje</CardTitle>
              {/* Lista no celular (rótulo à esquerda, prato à direita), três
                  colunas quando a largura deixa o nome do prato respirar. */}
              <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-3">
                {meals.map((meal) => (
                  <div
                    key={meal.type}
                    className="flex items-center justify-between gap-1 text-sm sm:flex-col sm:items-start sm:justify-start"
                  >
                    <span className="text-text-secondary sm:text-xs sm:font-medium sm:uppercase sm:tracking-wide">
                      {mealTypeLabels[meal.type]}
                    </span>
                    <span className="text-text-primary">{meal.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="contents lg:flex lg:flex-col lg:gap-6">
            <Card className="order-3 lg:order-none">
              <CardTitle className="mb-3">Tarefas de hoje</CardTitle>
              <HomeTaskList items={tasks} />
            </Card>
          </div>

          <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-6 xl:col-span-1">
            <Card className="order-2 lg:order-none">
              <div className="mb-3 flex items-center justify-between">
                <CardTitle>Hábitos do dia</CardTitle>
                <span className="text-sm text-text-secondary">
                  {habitsDone}/{habits.length}
                </span>
              </div>
              <div className="mb-4">
                <HomeHabitList items={habits} />
              </div>
              <WaterTracker
                dayId={day.id}
                initialCount={waterCount}
                settings={settings}
              />
            </Card>

            <div className="order-6 lg:order-none">
              <PillarHighlightCard pillar={pillarHighlight} />
            </div>
          </div>

          {/* No celular o resto do dia (refeições, humor, notas) fica numa
              tela à parte; no desktop a sidebar já está à vista. */}
          <Link
            href="/dia"
            className="order-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-accent-contrast lg:hidden"
          >
            Ver dia completo
          </Link>
        </div>
      </main>
    </>
  );
}
