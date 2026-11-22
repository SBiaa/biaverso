import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { closedAtFor } from "@/lib/measured-goals";
import { measuredGoalPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, measuredGoalPatchSchema);

  // Só recalcula o encerramento quando o status vem no corpo.
  let closedAt: Date | null | undefined;
  if (data.status !== undefined) {
    const current = await prisma.measuredGoal.findUniqueOrThrow({
      where: { id },
      select: { closedAt: true },
    });
    closedAt = closedAtFor(data.status, current.closedAt);
  }

  return NextResponse.json(
    await prisma.measuredGoal.update({ where: { id }, data: { ...data, closedAt } }),
  );
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.measuredGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
