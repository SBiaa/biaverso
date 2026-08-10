import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { dayPatchSchema } from "@/lib/schemas";
import { materializeRoutineTasks, replaceRoutineTasksForDay } from "@/lib/day";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { mood, energy, notes, type } = await parseBody(request, dayPatchSchema);

  const current = type
    ? await prisma.day.findUniqueOrThrow({ where: { id }, select: { type: true } })
    : null;

  const day = await prisma.day.update({
    where: { id },
    data: { mood, energy, notes, type },
  });

  if (type && current && current.type !== type) {
    await replaceRoutineTasksForDay(day);
  } else if (type) {
    await materializeRoutineTasks(day);
  }

  return NextResponse.json(day);
});
