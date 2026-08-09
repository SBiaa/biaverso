import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { title, target, deadline, status, progress, conceptualGoalId } =
    await request.json();

  const goal = await prisma.measuredGoal.update({
    where: { id },
    data: {
      title,
      target,
      deadline: deadline ? new Date(deadline) : deadline,
      status,
      progress,
      conceptualGoalId,
    },
  });

  return NextResponse.json(goal);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.measuredGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
