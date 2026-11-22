import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { closedAtFor } from "@/lib/measured-goals";
import { measuredGoalRenewSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

// Encerra a meta atual e cria a próxima no mesmo objetivo conceitual, numa
// transação só: não dá para ficar com a antiga fechada e a nova faltando.
export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { close, next } = await parseBody(request, measuredGoalRenewSchema);

  const [closed, created] = await prisma.$transaction(async (tx) => {
    const previous = await tx.measuredGoal.findUniqueOrThrow({ where: { id } });
    const current = await tx.measuredGoal.update({
      where: { id },
      data: { ...close, closedAt: closedAtFor(close.status, previous.closedAt) },
    });
    const fresh = await tx.measuredGoal.create({
      data: {
        title: next.title,
        target: next.target ?? null,
        targetValue: next.targetValue ?? null,
        deadline: next.deadline ?? null,
        term: previous.term,
        unit: previous.unit,
        businessId: previous.businessId,
        conceptualGoalId: previous.conceptualGoalId,
      },
    });
    return [current, fresh];
  });

  return NextResponse.json({ closed, created });
});
