import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { eventPatchSchema } from "@/lib/schemas";
import { deleteEventEverywhere } from "@/lib/agenda";
import type { Prisma } from "@/app/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

// Edita um evento e volta a marcá-lo como PENDENTE — assim a próxima
// sincronização sabe que precisa levar a alteração ao Google (o app prevalece).
export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const body = await parseBody(request, eventPatchSchema);

  const data: Prisma.EventUncheckedUpdateInput = { syncStatus: "PENDENTE" };

  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.category !== undefined) data.category = body.category;
  if (body.allDay !== undefined) data.allDay = body.allDay;
  if (body.time !== undefined) data.time = body.time;
  if (body.endTime !== undefined) data.endTime = body.endTime;

  if (body.date !== undefined) {
    data.date = body.date;

    const day = await prisma.day.upsert({
      where: { date: body.date },
      update: {},
      create: { date: body.date },
      select: { id: true },
    });
    data.dayId = day.id;
  }

  // Evento sem hora é evento de dia inteiro — o Google recusa o contrário.
  if (data.allDay === true) {
    data.time = null;
    data.endTime = null;
  } else if (body.time === null) {
    data.allDay = true;
    data.endTime = null;
  }

  return NextResponse.json(await prisma.event.update({ where: { id }, data }));
});

// Apaga o evento no app e também no Google (ver `deleteEventEverywhere`).
export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) throw new ApiError(404, "Evento não encontrado.");

  const { googleDeleted } = await deleteEventEverywhere(id);

  return NextResponse.json({ ok: true, googleDeleted });
});
