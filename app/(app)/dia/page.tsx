import { prisma } from "@/lib/prisma";
import { getOrCreateDay, materializeRoutineTasks, materializeHabits } from "@/lib/day";
import { parseDateOnly, toDateInputValue, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { DayPicker } from "@/components/modules/dia/DayPicker";
import { MoodEnergySelector } from "@/components/modules/dia/MoodEnergySelector";
import { DayTypeToggle } from "@/components/modules/dia/DayTypeToggle";
import { HabitChecklist } from "@/components/modules/dia/HabitChecklist";
import { WaterTracker } from "@/components/modules/dia/WaterTracker";
import { TaskListByOrigin } from "@/components/modules/dia/TaskListByOrigin";
import { MealChecklist } from "@/components/modules/dia/MealChecklist";
import { NotesField } from "@/components/modules/dia/NotesField";
import { AceTasksToday } from "@/components/modules/dia/AceTasksToday";
import { getUtcDayRange } from "@/lib/ace";
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

  return prisma.day.findUniqueOrThrow({
    where: { id: created.id },
    include: {
      habits: { include: { habit: true } },
      waterLogs: true,
      tasks: { orderBy: { order: "asc" } },
      mealLogs: { include: { recipe: true } },
    },
  });
}

type SearchParams = Promise<{ date?: string }>;

export default async function DiaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  // Param inválido cai para hoje em vez de criar um Day com data inválida.
  const date = (params.date ? parseDateOnly(params.date) : null) ?? todayUtc();
  const day = await getDay(date);

  const { start: dueStart, end: dueEnd } = getUtcDayRange(date);
  const aceTasks = await prisma.productionTask.findMany({
    where: { dueDate: { gte: dueStart, lt: dueEnd }, status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
    orderBy: { createdAt: "asc" },
  });

  const meals = (["CAFE_DA_MANHA", "ALMOCO", "JANTAR"] as MealType[]).map(
    (mealType) => {
      const log = day.mealLogs.find((m) => m.mealType === mealType);
      return {
        mealType,
        label: mealTypeLabels[mealType],
        recipeTitle: log?.recipe?.title ?? null,
        logId: log?.id ?? null,
        eaten: log?.eaten ?? false,
      };
    },
  );

  return (
    <>
      <Topbar title="Dia a dia" />
      <main key={day.id} className="flex-1 space-y-4 p-4 md:p-6 md:max-w-3xl">
        <div>
          <DayPicker date={day.date.toISOString()} />
          <p className="text-sm text-text-secondary">Como está o seu dia?</p>
        </div>

        <Card>
          <MoodEnergySelector
            dayId={day.id}
            initialMood={day.mood}
            initialEnergy={day.energy}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <DayTypeToggle dayId={day.id} initialType={day.type} />
          <HabitChecklist
            items={day.habits.map((h) => ({
              id: h.id,
              name: h.habit.name,
              done: h.done,
            }))}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Tarefas de hoje
          </h2>
          <TaskListByOrigin
            dayId={day.id}
            dayDate={toDateInputValue(day.date)}
            initialTasks={day.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              done: t.done,
              origin: t.origin as BadgeOrigin,
            }))}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Produção Ace
          </h2>
          <AceTasksToday
            initialTasks={aceTasks.map((t) => ({ id: t.id, title: t.title, status: t.status }))}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Água
          </h2>
          <WaterTracker dayId={day.id} initialCount={day.waterLogs.length} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Cardápio
          </h2>
          <MealChecklist dayId={day.id} initialMeals={meals} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Notas do dia
          </h2>
          <NotesField dayId={day.id} initialNotes={day.notes} />
        </Card>
      </main>
    </>
  );
}
