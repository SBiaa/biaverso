import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { timeEntryStartSchema } from "@/lib/schemas";
import { getOrCreateToday } from "@/lib/day";

// Aperta "iniciar": fecha o que estava rodando (se houver) e começa um novo,
// sempre em hoje — o dia sendo visualizado na tela pode ser outro.
export const POST = route(async (request: Request) => {
  const { categoryId, title } = await parseBody(request, timeEntryStartSchema);

  const day = await getOrCreateToday();
  const now = new Date();

  await prisma.timeEntry.updateMany({
    where: { endedAt: null },
    data: { endedAt: now },
  });

  const entry = await prisma.timeEntry.create({
    data: { dayId: day.id, categoryId, title, startedAt: now },
  });

  return NextResponse.json(entry);
});
