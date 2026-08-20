import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { covenMeetingPatchSchema } from "@/lib/schemas";
import { removeMeetingEvent, writeMeetingEvent } from "@/lib/espiritual";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, covenMeetingPatchSchema);

  const meeting = await prisma.covenMeeting.update({ where: { id }, data });
  // Mesmo uma anotação depois do encontro passa por aqui: é mais barato
  // reescrever o evento do que decidir campo a campo se ele mudou.
  await writeMeetingEvent(meeting.id);

  return NextResponse.json(meeting);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const meeting = await prisma.covenMeeting.findUniqueOrThrow({
    where: { id },
    select: { eventId: true },
  });

  // O evento sai primeiro: apagar o encontro antes zeraria o `eventId` (a FK é
  // SetNull) e o compromisso ficaria órfão na agenda e no Google.
  await removeMeetingEvent(meeting.eventId);
  await prisma.covenMeeting.delete({ where: { id } });

  return NextResponse.json({ ok: true });
});
