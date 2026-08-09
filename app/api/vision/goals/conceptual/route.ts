import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pillarId = searchParams.get("pillarId");

  const goals = await prisma.conceptualGoal.findMany({
    where: pillarId ? { pillarId } : undefined,
    include: { measuredGoals: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const { title, description, pillarId } = await request.json();

  const goal = await prisma.conceptualGoal.create({
    data: {
      title,
      description: description || null,
      pillarId,
    },
  });

  return NextResponse.json(goal);
}
