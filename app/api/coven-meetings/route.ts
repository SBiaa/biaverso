import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { covenMeetingCreateSchema } from "@/lib/schemas";
import { writeMeetingEvent } from "@/lib/espiritual";

// Todo encontro nasce com um evento espelho na Agenda — é assim que ele chega
// ao Google Calendar e aparece no /dia.
export const POST = route(async (request: Request) => {
  const data = await parseBody(request, covenMeetingCreateSchema);

  const meeting = await prisma.covenMeeting.create({ data });
  await writeMeetingEvent(meeting.id);

  return NextResponse.json(meeting);
});
