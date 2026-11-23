import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { brainstormGoalSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

// "Virar meta": cria o objetivo metrificado (e, se pedido, o conceitual) e liga
// ao item, numa transação só. Com `onlyConceptual`, para no objetivo conceitual:
// a meta com número fica para depois. Nos dois casos o item sai dos rascunhos.
export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, brainstormGoalSchema);

  const item = await prisma.$transaction(async (tx) => {
    const current = await tx.brainstormItem.findUniqueOrThrow({ where: { id } });
    if (current.measuredGoalId) throw new ApiError(409, "Esse item já virou meta.");

    let conceptualGoalId = data.conceptualGoalId;
    if (!conceptualGoalId) {
      if (!current.pillarId) {
        throw new ApiError(400, "Escolha um pilar para o item antes de criar o objetivo conceitual.");
      }
      const conceptual = await tx.conceptualGoal.create({
        data: { title: data.newConceptualTitle!, pillarId: current.pillarId },
      });
      conceptualGoalId = conceptual.id;
    }

    if (data.onlyConceptual) {
      return tx.brainstormItem.update({
        where: { id },
        data: { decision: "FOCO", conceptualGoalId, organizedAt: new Date() },
      });
    }

    const goal = await tx.measuredGoal.create({
      data: {
        title: data.title,
        targetValue: data.targetValue ?? null,
        unit: data.unit,
        deadline: data.deadline ?? null,
        conceptualGoalId,
      },
    });

    return tx.brainstormItem.update({
      where: { id },
      data: { decision: "FOCO", measuredGoalId: goal.id, organizedAt: new Date() },
      include: { measuredGoal: { select: { id: true, title: true } } },
    });
  });

  return NextResponse.json(item);
});
