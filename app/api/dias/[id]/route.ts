import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { materializeRoutineTasks, replaceRoutineTasksForDay } from "@/lib/day";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { mood, energy, notes, type } = await request.json();

  const current = type
    ? await prisma.day.findUnique({ where: { id }, select: { type: true } })
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
}
