import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name, active } = await request.json();

  const habit = await prisma.habit.update({
    where: { id },
    data: { name, active },
  });

  return NextResponse.json(habit);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await prisma.$transaction([
    prisma.habitLog.deleteMany({ where: { habitId: id } }),
    prisma.habit.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
