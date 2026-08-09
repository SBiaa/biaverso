import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { title, description, pillarId } = await request.json();

  const goal = await prisma.conceptualGoal.update({
    where: { id },
    data: { title, description, pillarId },
  });

  return NextResponse.json(goal);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await prisma.$transaction([
    prisma.measuredGoal.deleteMany({ where: { conceptualGoalId: id } }),
    prisma.conceptualGoal.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
