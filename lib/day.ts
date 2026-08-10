import { prisma } from "@/lib/prisma";
import { todayUtc } from "@/lib/utils";
import type { Day } from "@/app/generated/prisma/client";

export async function getOrCreateDay(date: Date): Promise<Day> {
  return prisma.day.upsert({
    where: { date },
    update: {},
    create: { date },
  });
}

export async function getOrCreateToday(): Promise<Day> {
  return getOrCreateDay(todayUtc());
}

function routineTypeFor(day: Day) {
  return day.type === "FAXINA" ? "ROTINA_FAXINA" : "ROTINA_NORMAL";
}

export async function materializeRoutineTasks(day: Day) {
  const type = routineTypeFor(day);

  const [templates, existing] = await Promise.all([
    prisma.task.findMany({
      where: { dayId: null, type },
      orderBy: { order: "asc" },
    }),
    prisma.task.findMany({
      where: { dayId: day.id, type },
      select: { title: true, templateId: true },
    }),
  ]);

  // O vínculo por `templateId` é o que vale: renomear um template não recria a
  // tarefa. O título continua sendo aceito como chave para as cópias antigas,
  // criadas antes de o campo existir.
  const materialized = new Set(
    existing.flatMap((t) => (t.templateId ? [t.templateId] : [t.title])),
  );
  const missing = templates.filter(
    (t) => !materialized.has(t.id) && !materialized.has(t.title),
  );

  if (missing.length > 0) {
    await prisma.task.createMany({
      data: missing.map((t) => ({
        title: t.title,
        origin: t.origin,
        type: t.type,
        order: t.order,
        dueDate: day.date,
        dayId: day.id,
        templateId: t.id,
      })),
    });
  }
}

export async function materializeHabits(day: Day) {
  const [habits, existing] = await Promise.all([
    prisma.habit.findMany({ where: { active: true } }),
    prisma.habitLog.findMany({
      where: { dayId: day.id },
      select: { habitId: true },
    }),
  ]);

  const existingIds = new Set(existing.map((l) => l.habitId));
  const missing = habits.filter((h) => !existingIds.has(h.id));

  if (missing.length > 0) {
    await prisma.habitLog.createMany({
      data: missing.map((h) => ({ habitId: h.id, dayId: day.id })),
    });
  }
}

// Usado quando o usuário confirma a troca de Dia Normal/Faxina: remove as tarefas
// de rotina já copiadas para o dia (mantendo as avulsas) e copia o template do novo tipo.
export async function replaceRoutineTasksForDay(day: Day) {
  await prisma.task.deleteMany({
    where: { dayId: day.id, type: { in: ["ROTINA_NORMAL", "ROTINA_FAXINA"] } },
  });
  await materializeRoutineTasks(day);
}
