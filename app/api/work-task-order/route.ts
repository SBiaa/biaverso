import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { workTaskOrderSchema } from "@/lib/schemas";

/**
 * Grava a ordem de execução: a posição de cada tarefa é o índice dela na lista
 * recebida. Numa transação só, para um erro no meio não deixar metade da lista
 * na ordem velha e metade na nova.
 */
export const PUT = route(async (request: Request) => {
  const { items } = await parseBody(request, workTaskOrderSchema);

  await prisma.$transaction(
    items.map(({ kind, taskId }, position) =>
      prisma.workTaskOrder.upsert({
        where: { kind_taskId: { kind, taskId } },
        create: { kind, taskId, position },
        update: { position },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
});
