import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { ritualLogCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, ritualLogCreateSchema);
  return NextResponse.json(await prisma.ritualLog.create({ data }));
});
