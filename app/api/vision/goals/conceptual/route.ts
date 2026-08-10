import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery, route } from "@/lib/api";
import { conceptualGoalCreateSchema, pillarIdQuerySchema } from "@/lib/schemas";

export const GET = route(async (request: Request) => {
  const { pillarId } = parseQuery(request, pillarIdQuerySchema);
  const goals = await prisma.conceptualGoal.findMany({
    where: pillarId ? { pillarId } : undefined,
    include: { measuredGoals: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(goals);
});

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, conceptualGoalCreateSchema);
  return NextResponse.json(await prisma.conceptualGoal.create({ data }));
});
