import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conceptualGoalId = searchParams.get("conceptualGoalId");

  const goals = await prisma.measuredGoal.findMany({
    where: conceptualGoalId ? { conceptualGoalId } : undefined,
    orderBy: { deadline: "asc" },
  });

  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const { title, target, deadline, status, progress, conceptualGoalId } =
    await request.json();

  const goal = await prisma.measuredGoal.create({
    data: {
      title,
      target: target || null,
      deadline: deadline ? new Date(deadline) : null,
      status: status || undefined,
      progress: progress ?? 0,
      conceptualGoalId,
    },
  });

  return NextResponse.json(goal);
}
