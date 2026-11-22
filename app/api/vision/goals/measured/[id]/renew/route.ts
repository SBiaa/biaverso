import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { measuredGoalRenewSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

// Encerra a meta atual e cria a próxima no mesmo objetivo conceitual, numa
// transação só: não dá para ficar com a antiga fechada e a nova faltando.
export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { close, next } = await parseBody(request, measuredGoalRenewSchema);

  const [closed, created] = await prisma.$transaction(async (tx) => {
    const current = await tx.measuredGoal.update({ where: { id }, data: close });
    const fresh = await tx.measuredGoal.create({
      data: {
        title: next.title,
        target: next.target ?? null,
        deadline: next.deadline ?? null,
        conceptualGoalId: current.conceptualGoalId,
      },
    });
    return [current, fresh];
  });

  return NextResponse.json({ closed, created });
});
