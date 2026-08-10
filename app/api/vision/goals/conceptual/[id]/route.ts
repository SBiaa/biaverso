import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { conceptualGoalPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, conceptualGoalPatchSchema);
  return NextResponse.json(await prisma.conceptualGoal.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Os objetivos metrificados somem junto (onDelete: Cascade).
  await prisma.conceptualGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
