import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { eventCreateSchema } from "@/lib/schemas";

// Cria um evento no app. Nasce PENDENTE (default do schema) para a próxima
// sincronização levá-lo ao Google Calendar.
export const POST = route(async (request: Request) => {
  const { title, description, date, time, endTime, allDay, category } =
    await parseBody(request, eventCreateSchema);

  // Evento sem hora é evento de dia inteiro — o Google recusa o contrário.
  const start = allDay ? null : (time ?? null);

  // A home lista os eventos através do Day, então o evento já nasce ligado ao dia.
  const day = await prisma.day.upsert({
    where: { date },
    update: {},
    create: { date },
    select: { id: true },
  });

  const event = await prisma.event.create({
    data: {
      title,
      description,
      date,
      time: start,
      endTime: start === null ? null : (endTime ?? null),
      allDay: allDay || start === null,
      category,
      dayId: day.id,
    },
  });

  return NextResponse.json(event);
});
