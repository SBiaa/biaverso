import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeTime } from "@/lib/google-calendar";
import { parseDateOnly } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Cria um evento no app. Nasce PENDENTE (default do schema) para a próxima
// sincronização levá-lo ao Google Calendar.
export async function POST(request: Request) {
  const body = await request.json();
  const { title, description, date, time, endTime, allDay, category } = body;

  if (typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  }

  const eventDate = typeof date === "string" ? parseDateOnly(date) : null;
  if (!eventDate) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  const isAllDay = Boolean(allDay);
  const start = isAllDay ? null : normalizeTime(time);

  // A home lista os eventos através do Day, então o evento já nasce ligado ao dia.
  const day = await prisma.day.upsert({
    where: { date: eventDate },
    update: {},
    create: { date: eventDate },
    select: { id: true },
  });

  const event = await prisma.event.create({
    data: {
      title: title.trim(),
      description: typeof description === "string" && description.trim() !== ""
        ? description.trim()
        : null,
      date: eventDate,
      time: start,
      endTime: isAllDay ? null : normalizeTime(endTime),
      allDay: isAllDay || start === null,
      category: category ?? "PESSOAL",
      dayId: day.id,
    },
  });

  return NextResponse.json(event);
}
