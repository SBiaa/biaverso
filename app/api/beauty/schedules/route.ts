import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { getSchedules } from "@/lib/beleza";
import { careScheduleCreateSchema } from "@/lib/schemas";

export const GET = route(async () => {
  return NextResponse.json(await getSchedules());
});

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, careScheduleCreateSchema);
  return NextResponse.json(await prisma.careSchedule.create({ data }));
});
