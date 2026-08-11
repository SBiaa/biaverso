import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { subtaskCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const { title, taskId, productionTaskId, collectionTaskId } = await parseBody(
    request,
    subtaskCreateSchema,
  );

  // O schema garante que só um destes veio preenchido.
  const owner = taskId
    ? { taskId }
    : productionTaskId
      ? { productionTaskId }
      : { collectionTaskId };

  // Entra no fim da lista da tarefa dona, sem depender da ordem de criação.
  const last = await prisma.subtask.findFirst({
    where: owner,
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const subtask = await prisma.subtask.create({
    data: { title, ...owner, order: last ? last.order + 1 : 0 },
  });

  return NextResponse.json(subtask);
});
