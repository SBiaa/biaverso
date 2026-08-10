import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery, route } from "@/lib/api";
import { conceptualGoalIdQuerySchema, measuredGoalCreateSchema } from "@/lib/schemas";

export const GET = route(async (request: Request) => {
  const { conceptualGoalId } = parseQuery(request, conceptualGoalIdQuerySchema);
  const goals = await prisma.measuredGoal.findMany({
    where: conceptualGoalId ? { conceptualGoalId } : undefined,
    orderBy: { deadline: "asc" },
  });
  return NextResponse.json(goals);
});

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, measuredGoalCreateSchema);
  return NextResponse.json(
    await prisma.measuredGoal.create({
      data: { ...data, target: data.target ?? null, deadline: data.deadline ?? null },
    }),
  );
});
