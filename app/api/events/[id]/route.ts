import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calendarClient, getAuthClient, normalizeTime } from "@/lib/google-calendar";
import { parseDateOnly } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Edita um evento e volta a marcá-lo como PENDENTE — assim a próxima
// sincronização sabe que precisa levar a alteração ao Google (o app prevalece).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim() !== "") {
    data.title = body.title.trim();
  }

  if ("description" in body) {
    data.description =
      typeof body.description === "string" && body.description.trim() !== ""
        ? body.description.trim()
        : null;
  }

  if (typeof body.date === "string") {
    const eventDate = parseDateOnly(body.date);
    if (!eventDate) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }
    data.date = eventDate;

    const day = await prisma.day.upsert({
      where: { date: eventDate },
      update: {},
      create: { date: eventDate },
      select: { id: true },
    });
    data.dayId = day.id;
  }

  if ("allDay" in body) data.allDay = Boolean(body.allDay);
  if ("time" in body) data.time = normalizeTime(body.time);
  if ("endTime" in body) data.endTime = normalizeTime(body.endTime);
  if ("category" in body) data.category = body.category;

  // Evento sem hora é evento de dia inteiro — o Google recusa o contrário.
  if (data.allDay === true) {
    data.time = null;
    data.endTime = null;
  } else if (data.time === null && "time" in body) {
    data.allDay = true;
    data.endTime = null;
  }

  const event = await prisma.event.update({
    where: { id },
    data: { ...data, syncStatus: "PENDENTE" },
  });

  return NextResponse.json(event);
}

// Apaga o evento no app e também no Google. Sem apagar lá, a próxima
// sincronização traria o evento de volta.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  let googleDeleted = true;

  if (event.googleEventId) {
    try {
      const calendar = calendarClient(await getAuthClient());
      await calendar.events.delete({
        calendarId: event.googleCalendarId ?? "primary",
        eventId: event.googleEventId,
      });
    } catch {
      // Desconectado, evento já removido lá ou calendário somente leitura:
      // o evento sai do app do mesmo jeito.
      googleDeleted = false;
    }
  }

  await prisma.event.delete({ where: { id } });

  return NextResponse.json({ ok: true, googleDeleted });
}
