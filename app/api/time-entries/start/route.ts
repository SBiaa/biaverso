import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { timeEntryStartSchema } from "@/lib/schemas";
import { getOrCreateToday } from "@/lib/day";
import { resolveEntryLinks, serializeTimeEntry } from "@/lib/time-tracking";

// Aperta "iniciar": fecha o que estava rodando (se houver) e começa um novo,
// sempre em hoje — o dia sendo visualizado na tela pode ser outro.
export const POST = route(async (request: Request) => {
  const { categoryId, title, description, projectId, taskId, pomodoro } = await parseBody(request, timeEntryStartSchema);

  const links = await resolveEntryLinks(projectId, taskId);
  const day = await getOrCreateToday();
  const now = new Date();

  await prisma.timeEntry.updateMany({
    where: { endedAt: null },
    data: { endedAt: now },
  });

  const entry = await prisma.timeEntry.create({
    data: {
      dayId: day.id,
      categoryId,
      title,
      description,
      ...links,
      pomodoro,
      startedAt: now,
    },
  });

  return NextResponse.json(serializeTimeEntry(entry));
});
