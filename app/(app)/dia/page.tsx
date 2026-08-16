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
import { DayTypeToggle } from "@/components/modules/dia/DayTypeToggle";
import { HabitChecklist } from "@/components/modules/dia/HabitChecklist";
import { WaterTracker } from "@/components/modules/dia/WaterTracker";
import { TaskListByOrigin } from "@/components/modules/dia/TaskListByOrigin";
import { MealChecklist } from "@/components/modules/dia/MealChecklist";
import { NotesField } from "@/components/modules/dia/NotesField";
import {
  ProductionTasksToday,
  type ProductionGroup,
} from "@/components/modules/dia/ProductionTasksToday";
import { CollectionTasksToday } from "@/components/modules/dia/CollectionTasksToday";
import { TodayRoutines } from "@/components/modules/beleza/TodayRoutines";
import { DueCareToday } from "@/components/modules/beleza/DueCareToday";
import { getAppointmentsDueBy, getRoutinesForDay } from "@/lib/beleza";
import { getUtcDayRange, isTaskOverdue } from "@/lib/ace";
import { productionTypeLabels, taskTypeLabels } from "@/lib/labels";
import { getUserSettings } from "@/lib/settings";
import { getWeekStart, weekdayIndex } from "@/lib/cardapio";
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
 * Seção pesada e independente do resto da tela: a consulta varre as tarefas de
 * produção em aberto de todos os negócios, sem corte inferior de data. Isolada
 * atrás de um Suspense, ela não segura mais a pintura do dia inteiro.
 */
async function ProductionSection({ date }: { date: Date }) {
  const { end: dueEnd } = getUtcDayRange(date);

  // Vencidas em dias anteriores continuam aparecendo enquanto estiverem
  // abertas — é o que faz o selo "Atrasado" ter para quem aparecer.
  const tasks = await prisma.productionTask.findMany({
    where: {
      dueDate: { lt: dueEnd },
      status: { notIn: ["CONCLUIDO", "CANCELADO"] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      type: true,
      priority: true,
      dueDate: true,
      businessId: true,
      business: { select: { name: true, color: true } },
      client: { select: { name: true } },
      subtasks: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, done: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
  });

  // Um grupo por negócio, montado a partir do `businessId` de cada tarefa. O
  // nome e a cor saem do próprio registro do negócio — nada de rótulo fixo.
  const groups: ProductionGroup[] = [];
  const byBusiness = new Map<string, ProductionGroup>();

  for (const task of tasks) {
    let group = byBusiness.get(task.businessId);
    if (!group) {
      group = {
        businessId: task.businessId,
        businessName: task.business.name,
        businessColor: task.business.color,
        tasks: [],
      };
      byBusiness.set(task.businessId, group);
      groups.push(group);
    }
    group.tasks.push({
      id: task.id,
      title: task.title,
      status: task.status,
      typeLabel: productionTypeLabels[task.type],
      clientName: task.client?.name ?? null,
      urgent: task.priority === "URGENTE",
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      overdue: isTaskOverdue(task),
      subtasks: task.subtasks,
    });
  }

  groups.sort((a, b) => a.businessName.localeCompare(b.businessName, "pt-BR"));

  return <ProductionTasksToday groups={groups} />;
}

/**
 * Tarefas de coleção com prazo até hoje. Mesma regra das tarefas de produção:
 * o que venceu antes e continua aberto segue aparecendo.
 */
async function CollectionTasksSection({ date }: { date: Date }) {
  const { start: dayStart, end: dayEnd } = getUtcDayRange(date);

  const tasks = await prisma.collectionTask.findMany({
    where: {
      OR: [
        // Abertas com prazo até hoje — as atrasadas continuam à vista.
        { done: false, dueDate: { lt: dayEnd } },
        // Concluídas hoje ficam na lista para dar o senso de progresso do dia.
        { done: true, dueDate: { gte: dayStart, lt: dayEnd } },
      ],
    },
    select: {
      id: true,
      title: true,
      done: true,
      dueDate: true,
      collectionId: true,
      collection: {
        select: { name: true, businessId: true, business: { select: { color: true } } },
      },
      subtasks: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, done: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { order: "asc" }],
  });

  return (
    <CollectionTasksToday
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        done: t.done,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        overdue: !t.done && t.dueDate !== null && t.dueDate.getTime() < todayUtc().getTime(),
        collectionId: t.collectionId,
        collectionName: t.collection.name,
        businessId: t.collection.businessId,
        businessColor: t.collection.business.color,
        subtasks: t.subtasks,
      }))}
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

  const [settings, mealPlans] = await Promise.all([
    getUserSettings(),
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

        {/* Duas colunas de peso diferente, e não uma pilha: à esquerda o que é
            longo e muda o dia todo (tarefas, produção, coleções); à direita os
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
                initialTasks={day.tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  done: t.done,
                  origin: t.origin as BadgeOrigin,
                  // "Avulsa" em quase toda linha vira ruído: só rotina vale o selo.
                  typeLabel: t.type === "AVULSA" ? null : taskTypeLabels[t.type],
                  business: t.business,
                  overdue: !t.done && t.dueDate !== null && t.dueDate.getTime() < today.getTime(),
                  subtasks: t.subtasks,
                }))}
              />
            </Card>

            <Suspense fallback={<SectionFallback />}>
              <ProductionSection date={date} />
            </Suspense>

            <Suspense fallback={<SectionFallback />}>
              <CollectionTasksSection date={date} />
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
