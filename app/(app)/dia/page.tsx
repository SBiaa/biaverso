import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  getOrCreateDay,
  materializeHabits,
  materializeRoutineTasks,
} from "@/lib/day";
import { parseDateOnly, toDateInputValue, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardTitle, Skeleton } from "@/components/ui";
import { DayPicker } from "@/components/modules/dia/DayPicker";
import { MoodEnergySelector } from "@/components/modules/dia/MoodEnergySelector";
import { DaySummary } from "@/components/modules/dia/DaySummary";
import { FocusToday, type FocusItem } from "@/components/modules/dia/FocusToday";
import { DayTypeToggle } from "@/components/modules/dia/DayTypeToggle";
import { HabitChecklist } from "@/components/modules/dia/HabitChecklist";
import { WaterTracker } from "@/components/modules/dia/WaterTracker";
import { TaskListByOrigin } from "@/components/modules/dia/TaskListByOrigin";
import { MealChecklist } from "@/components/modules/dia/MealChecklist";
import { NotesField } from "@/components/modules/dia/NotesField";
import { WorkTasksToday, type WorkTask } from "@/components/modules/dia/WorkTasksToday";
import { TodayRoutines } from "@/components/modules/beleza/TodayRoutines";
import { DueCareToday } from "@/components/modules/beleza/DueCareToday";
import { getAppointmentsDueBy, getRoutinesForDay } from "@/lib/beleza";
import { productionTypeLabels } from "@/lib/labels";
import { getUserSettings } from "@/lib/settings";
import { getWeekStart, weekdayIndex } from "@/lib/cardapio";
import { focusKey, type FocusKind } from "@/lib/day-focus";
import type { BadgeOrigin } from "@/components/ui";
import type { MealType } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

const mealTypeLabels: Record<string, string> = {
  CAFE_DA_MANHA: "Café da manhã",
  ALMOCO: "Almoço",
  JANTAR: "Janta",
};

async function getDay(date: Date) {
  const created = await getOrCreateDay(date);
  await materializeRoutineTasks(created);
  await materializeHabits(created);

  // `select` em vez de `include`: as relações completas traziam linha inteira de
  // Habit, Recipe e WaterLog só para ler um nome, um título e um total.
  return prisma.day.findUniqueOrThrow({
    where: { id: created.id },
    select: {
      id: true,
      date: true,
      mood: true,
      energy: true,
      type: true,
      notes: true,
      habits: {
        select: { id: true, done: true, habit: { select: { name: true } } },
      },
      // Só a contagem é usada na tela.
      waterLogs: { select: { id: true } },
      tasks: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          done: true,
          origin: true,
          type: true,
          dueDate: true,
          business: { select: { name: true, color: true } },
          subtasks: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, done: true },
          },
        },
      },
      mealLogs: {
        select: {
          id: true,
          mealType: true,
          eaten: true,
          recipe: { select: { title: true } },
        },
      },
    },
  });
}

/**
 * Tudo o que está em andamento nos negócios e nas coleções, numa lista só. A
 * consulta varre as tarefas em aberto sem corte de data e por isso fica atrás de
 * um Suspense: não segura a pintura do dia inteiro.
 *
 * Sem filtro de prazo, de propósito: antes só entrava tarefa com data até hoje,
 * então uma coleção em andamento cujas tarefas não tinham prazo não aparecia —
 * e o dia mostrava só a que já estava atrasada.
 */
async function WorkSection({
  date,
  dayId,
  focusKeys,
}: {
  date: Date;
  dayId: string;
  focusKeys: string[];
}) {
  const today = todayUtc();
  // Semana de segunda a domingo, como o cardápio. O corte é exclusivo.
  const dayEnd = new Date(date.getTime() + 86_400_000);
  const weekEnd = new Date(date.getTime() + (8 - (date.getUTCDay() || 7)) * 86_400_000);
  // Concluídas da semana do dia aberto: é o que a aba "Feitas" mostra.
  const weekStart = new Date(weekEnd.getTime() - 7 * 86_400_000);
  const doneThisWeek = { gte: weekStart, lt: weekEnd };

  const productionSelect = {
    id: true,
    title: true,
    type: true,
    priority: true,
    dueDate: true,
    priorityLevelId: true,
    estimateMinutes: true,
    business: { select: { name: true, color: true } },
    client: { select: { name: true } },
    subtasks: {
      orderBy: { order: "asc" },
      select: { id: true, title: true, done: true },
    },
  } as const;
  const collectionSelect = {
    id: true,
    title: true,
    dueDate: true,
    priorityLevelId: true,
    estimateMinutes: true,
    collectionId: true,
    collection: {
      select: { name: true, businessId: true, business: { select: { color: true } } },
    },
    subtasks: {
      orderBy: { order: "asc" },
      select: { id: true, title: true, done: true },
    },
  } as const;

  const prospectSelect = {
    id: true,
    title: true,
    dueDate: true,
    priorityLevelId: true,
    estimateMinutes: true,
    clientBusiness: {
      select: {
        client: { select: { id: true, name: true } },
        business: { select: { name: true, color: true } },
      },
    },
  } as const;
  // Só prospect em aberto: passo de quem já virou cliente ou foi perdido sai da lista.
  const openProspect = { clientBusiness: { status: "PROSPECT" as const } };

  const [levels, production, collection, doneProduction, doneCollection, prospect, doneProspect] = await Promise.all([
    prisma.priorityLevel.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true, color: true, order: true },
    }),
    prisma.productionTask.findMany({
      where: { status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
      select: productionSelect,
    }),
    prisma.collectionTask.findMany({
      where: { done: false, collection: { status: { not: "ENCERRADA" } } },
      select: collectionSelect,
    }),
    prisma.productionTask.findMany({
      where: { status: "CONCLUIDO", completedAt: doneThisWeek },
      select: productionSelect,
    }),
    prisma.collectionTask.findMany({
      where: { done: true, completedAt: doneThisWeek, collection: { status: { not: "ENCERRADA" } } },
      select: collectionSelect,
    }),
    prisma.prospectTask.findMany({
      where: { done: false, ...openProspect },
      select: prospectSelect,
    }),
    prisma.prospectTask.findMany({
      where: { done: true, completedAt: doneThisWeek, ...openProspect },
      select: prospectSelect,
    }),
  ]);

  const isLate = (due: Date | null) => due !== null && due.getTime() < today.getTime();

  const fromProduction = (t: (typeof production)[number], done: boolean): WorkTask => ({
    kind: "production",
    id: t.id,
    title: t.title,
    done,
    doneOnLoad: done,
    originLabel: t.business.name,
    originColor: t.business.color,
    originHref: null,
    detail: [productionTypeLabels[t.type], t.client?.name ?? "Interno"].join(" · "),
    urgent: !done && t.priority === "URGENTE",
    priorityLevelId: t.priorityLevelId,
    estimateMinutes: t.estimateMinutes,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    overdue: !done && isLate(t.dueDate),
    collectionId: null,
    subtasks: t.subtasks,
  });

  const fromCollection = (t: (typeof collection)[number], done: boolean): WorkTask => ({
    kind: "collection",
    id: t.id,
    title: t.title,
    done,
    doneOnLoad: done,
    originLabel: t.collection.name,
    originColor: t.collection.business.color,
    originHref: `/negocios/${t.collection.businessId}/colecoes/${t.collectionId}`,
    detail: "Coleção",
    urgent: false,
    priorityLevelId: t.priorityLevelId,
    estimateMinutes: t.estimateMinutes,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    overdue: !done && isLate(t.dueDate),
    collectionId: t.collectionId,
    subtasks: t.subtasks,
  });

  const fromProspect = (t: (typeof prospect)[number], done: boolean): WorkTask => ({
    kind: "prospect",
    id: t.id,
    title: t.title,
    done,
    doneOnLoad: done,
    originLabel: t.clientBusiness.client.name,
    originColor: t.clientBusiness.business.color,
    originHref: `/clientes/${t.clientBusiness.client.id}`,
    detail: `Prospecção · ${t.clientBusiness.business.name}`,
    urgent: false,
    priorityLevelId: t.priorityLevelId,
    estimateMinutes: t.estimateMinutes,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    overdue: !done && isLate(t.dueDate),
    collectionId: null,
    subtasks: [],
  });

  const tasks: WorkTask[] = [
    ...production.map((t) => fromProduction(t, false)),
    ...collection.map((t) => fromCollection(t, false)),
    ...doneProduction.map((t) => fromProduction(t, true)),
    ...doneCollection.map((t) => fromCollection(t, true)),
    ...prospect.map((t) => fromProspect(t, false)),
    ...doneProspect.map((t) => fromProspect(t, true)),
  ];

  return (
    <WorkTasksToday
      dayId={dayId}
      focusKeys={focusKeys}
      tasks={tasks}
      levels={levels}
      dayEnd={dayEnd.toISOString()}
      weekEnd={weekEnd.toISOString()}
    />
  );
}

/** Rotinas e agendamentos de beleza: duas consultas próprias, também isoladas. */
async function SelfCareSection({ date }: { date: Date }) {
  const [careRoutines, dueCare] = await Promise.all([
    getRoutinesForDay(date),
    getAppointmentsDueBy(date),
  ]);

  return (
    <Card>
      <CardTitle className="mb-3">Autocuidado</CardTitle>
      <TodayRoutines routines={careRoutines} date={date.toISOString()} />
      <DueCareToday items={dueCare} />
    </Card>
  );
}

/**
 * As tarefas do foco do dia, com o que a tela precisa para mostrá-las — feitas
 * ou não. Tarefa avulsa já veio com o dia; as de produção e coleção moram em
 * outras tabelas, então saem de duas consultas por id. Vínculo sem tarefa
 * (apagada) é ignorado.
 */
async function getFocusItems(
  dayId: string,
  dayTasks: Awaited<ReturnType<typeof getDay>>["tasks"],
): Promise<FocusItem[]> {
  const rows = await prisma.dayFocus.findMany({
    where: { dayId },
    orderBy: { createdAt: "asc" },
    select: { kind: true, taskId: true },
  });
  const idsOf = (kind: FocusKind) =>
    rows.filter((r) => r.kind === kind).map((r) => r.taskId);

  const [production, collection, prospect] = await Promise.all([
    prisma.productionTask.findMany({
      where: { id: { in: idsOf("production") } },
      select: { id: true, title: true, status: true, business: { select: { name: true, color: true } } },
    }),
    prisma.collectionTask.findMany({
      where: { id: { in: idsOf("collection") } },
      select: {
        id: true,
        title: true,
        done: true,
        collectionId: true,
        collection: {
          select: { name: true, businessId: true, business: { select: { color: true } } },
        },
      },
    }),
    prisma.prospectTask.findMany({
      where: { id: { in: idsOf("prospect") } },
      select: {
        id: true,
        title: true,
        done: true,
        clientBusiness: {
          select: {
            client: { select: { id: true, name: true } },
            business: { select: { color: true } },
          },
        },
      },
    }),
  ]);

  const items = rows.flatMap((row): FocusItem[] => {
    const base = { id: focusKey(row.kind as FocusKind, row.taskId), taskId: row.taskId };

    if (row.kind === "task") {
      const t = dayTasks.find((x) => x.id === row.taskId);
      return t
        ? [{ ...base, kind: "task", title: t.title, done: t.done, originLabel: t.business?.name ?? null, originColor: t.business?.color ?? null, originHref: null, collectionId: null }]
        : [];
    }
    if (row.kind === "production") {
      const t = production.find((x) => x.id === row.taskId);
      return t
        ? [{ ...base, kind: "production", title: t.title, done: t.status === "CONCLUIDO", originLabel: t.business.name, originColor: t.business.color, originHref: null, collectionId: null }]
        : [];
    }
    if (row.kind === "prospect") {
      const t = prospect.find((x) => x.id === row.taskId);
      return t
        ? [{ ...base, kind: "prospect", title: t.title, done: t.done, originLabel: t.clientBusiness.client.name, originColor: t.clientBusiness.business.color, originHref: `/clientes/${t.clientBusiness.client.id}`, collectionId: null }]
        : [];
    }
    const t = collection.find((x) => x.id === row.taskId);
    return t
      ? [{ ...base, kind: "collection", title: t.title, done: t.done, originLabel: t.collection.name, originColor: t.collection.business.color, originHref: `/negocios/${t.collection.businessId}/colecoes/${t.collectionId}`, collectionId: t.collectionId }]
      : [];
  });

  return items;
}

function SectionFallback() {
  return (
    <Card className="space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </Card>
  );
}

type SearchParams = Promise<{ date?: string }>;

export default async function DiaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = todayUtc();
  // Param inválido cai para hoje em vez de criar um Day com data inválida.
  const date = (params.date ? parseDateOnly(params.date) : null) ?? today;
  const day = await getDay(date);

  const [settings, focusItems, mealPlans] = await Promise.all([
    getUserSettings(),
    getFocusItems(day.id, day.tasks),
    prisma.mealPlan.findMany({
      where: { weekStart: getWeekStart(date), dayOfWeek: weekdayIndex(date) },
      select: { mealType: true, recipe: { select: { title: true } } },
    }),
  ]);

  const meals = (["CAFE_DA_MANHA", "ALMOCO", "JANTAR"] as MealType[]).map(
    (mealType) => {
      const log = day.mealLogs.find((m) => m.mealType === mealType);
      const plan = mealPlans.find((p) => p.mealType === mealType);
      return {
        mealType,
        label: mealTypeLabels[mealType],
        recipeTitle: log?.recipe?.title ?? plan?.recipe?.title ?? null,
        logId: log?.id ?? null,
        eaten: log?.eaten ?? false,
      };
    },
  );

  return (
    <>
      <Topbar title="Dia a dia" />
      <main
        key={day.id}
        className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:space-y-6 md:px-8 md:py-8"
      >
        <div>
          <DayPicker date={day.date.toISOString()} />
          <p className="text-sm text-text-secondary">Como está o seu dia?</p>
        </div>

        <DaySummary
          tasks={{ done: day.tasks.filter((t) => t.done).length, total: day.tasks.length }}
          habits={{ done: day.habits.filter((h) => h.done).length, total: day.habits.length }}
          meals={{ done: meals.filter((m) => m.eaten).length, total: meals.length }}
          water={{ done: day.waterLogs.length, total: settings.waterGoal }}
        />

        <FocusToday dayId={day.id} items={focusItems} />

        {/* Duas colunas de peso diferente, e não uma pilha: à esquerda o que é
            longo e muda o dia todo (tarefas e andamento dos negócios); à direita os
            registros curtos que você marca de passagem. Empilhados, os curtos
            jogavam as tarefas para 2000px abaixo da dobra. */}
        <div className="grid items-start gap-4 xl:grid-cols-3 xl:gap-6">
          {/* `min-w-0`: item de grid nasce com `min-width: auto`, então a
              coluna esticava para caber a tabela de produção inteira e o
              `overflow-x-auto` dela nunca chegava a rolar — a página é que
              vazava, 530px num visor de 375. */}
          <div className="flex min-w-0 flex-col gap-4 xl:col-span-2 xl:gap-6">
            <Card>
              {/* O seletor de tipo do dia mora aqui, e não junto dos hábitos:
                  o que ele troca são as tarefas de rotina desta lista. Ao lado
                  dos hábitos, parecia mexer neles. */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Tarefas de hoje</CardTitle>
                <DayTypeToggle dayId={day.id} initialType={day.type} />
              </div>
              <TaskListByOrigin
                dayId={day.id}
                dayDate={toDateInputValue(day.date)}
                dayInPast={day.date.getTime() < today.getTime()}
                focusIds={focusItems.filter((f) => f.kind === "task").map((f) => f.taskId)}
                initialTasks={day.tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  done: t.done,
                  origin: t.origin as BadgeOrigin,
                  business: t.business,
                  overdue: !t.done && t.dueDate !== null && t.dueDate.getTime() < today.getTime(),
                  subtasks: t.subtasks,
                }))}
              />
            </Card>

            <Suspense fallback={<SectionFallback />}>
              <WorkSection
                date={date}
                dayId={day.id}
                focusKeys={focusItems.map((f) => f.id)}
              />
            </Suspense>
          </div>

          <div className="flex min-w-0 flex-col gap-4 xl:gap-6">
            <Card>
              <MoodEnergySelector
                dayId={day.id}
                initialMood={day.mood}
                initialEnergy={day.energy}
              />
            </Card>

            <Card>
              <HabitChecklist
                items={day.habits.map((h) => ({
                  id: h.id,
                  name: h.habit.name,
                  done: h.done,
                }))}
              />
            </Card>

            <Card>
              <CardTitle className="mb-3">
                Água
              </CardTitle>
              <WaterTracker
                dayId={day.id}
                initialCount={day.waterLogs.length}
                settings={settings}
              />
            </Card>

            <Card>
              <CardTitle className="mb-3">
                Cardápio
              </CardTitle>
              <MealChecklist dayId={day.id} initialMeals={meals} />
            </Card>

            <Suspense fallback={<SectionFallback />}>
              <SelfCareSection date={date} />
            </Suspense>

            <Card>
              <CardTitle className="mb-3">
                Notas do dia
              </CardTitle>
              <NotesField dayId={day.id} initialNotes={day.notes} />
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
