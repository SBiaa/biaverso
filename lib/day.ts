import { prisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/utils";
import type { Day } from "@/app/generated/prisma/client";

export async function getOrCreateToday(): Promise<Day> {
  const date = startOfToday();
  return prisma.day.upsert({
    where: { date },
    update: {},
    create: { date },
  });
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
      select: { title: true },
    }),
  ]);

  const existingTitles = new Set(existing.map((t) => t.title));
  const missing = templates.filter((t) => !existingTitles.has(t.title));

  if (missing.length > 0) {
    await prisma.task.createMany({
      data: missing.map((t) => ({
        title: t.title,
        origin: t.origin,
        type: t.type,
        order: t.order,
        dueDate: day.date,
        dayId: day.id,
      })),
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
