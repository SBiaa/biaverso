import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { dayFocusSchema } from "@/lib/schemas";
import { MAX_FOCUS } from "@/lib/day-focus";

/** Marca ou tira uma tarefa do foco do dia. O limite é de `MAX_FOCUS` por dia. */
export const PUT = route(async (request: Request) => {
  const { dayId, kind, taskId, focused } = await parseBody(request, dayFocusSchema);
  const key = { dayId_kind_taskId: { dayId, kind, taskId } };

  if (!focused) {
    await prisma.dayFocus.deleteMany({ where: { dayId, kind, taskId } });
    return NextResponse.json({ focused: false });
  }

  // Transação: dois cliques rápidos não podem ler a mesma contagem e passar do limite.
  await prisma.$transaction(async (tx) => {
    if (await tx.dayFocus.findUnique({ where: key, select: { id: true } })) return;

    if ((await tx.dayFocus.count({ where: { dayId } })) >= MAX_FOCUS) {
      throw new ApiError(
        409,
        `O foco do dia tem no máximo ${MAX_FOCUS} tarefas. Tire uma para escolher outra.`,
      );
    }

    await tx.dayFocus.create({ data: { dayId, kind, taskId } });
  });

  return NextResponse.json({ focused: true });
});
