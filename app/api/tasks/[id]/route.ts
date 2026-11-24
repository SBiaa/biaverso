import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { taskPatchSchema } from "@/lib/schemas";
import type { Prisma } from "@/app/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const patch = await parseBody(request, taskPatchSchema);

  const data: Prisma.TaskUncheckedUpdateInput = {};

  if (patch.title !== undefined) {
    data.title = patch.title;
  }

  // `done` e `status` andam juntos: concluir por qualquer um dos dois acerta o
  // outro. Se vierem os dois, o status manda.
  const done = patch.status !== undefined ? patch.status === "CONCLUIDA" : patch.done;

  if (done !== undefined) {
    data.done = done;
    // Desmarcar limpa a data: senão uma tarefa reaberta continuaria contando
    // como sinal de vida do projeto no dia da primeira conclusão.
    data.completedAt = done ? new Date() : null;
  }

  if (patch.status !== undefined) {
    data.status = patch.status;
  } else if (patch.done !== undefined) {
    // Reabrir pelo círculo volta para "a fazer".
    data.status = patch.done ? "CONCLUIDA" : "A_FAZER";
  }

  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate;
  if (patch.scheduledDate !== undefined) data.scheduledDate = patch.scheduledDate;

  // Pendurar no Day é o que faz a tarefa aparecer no /dia — sem isso, o
  // "trazer para hoje" do radar mudaria o prazo e nada apareceria na tela.
  // O dia que manda é o da realização; sem ela, o do prazo.
  let anchor: Date | null | undefined = patch.scheduledDate ?? undefined;
  if (anchor === undefined && patch.dueDate) {
    const current = await prisma.task.findUniqueOrThrow({
      where: { id },
      select: { scheduledDate: true },
    });
    const scheduled =
      patch.scheduledDate === null ? null : current.scheduledDate;
    if (!scheduled) anchor = patch.dueDate;
  }
  if (anchor) {
    const day = await prisma.day.upsert({
      where: { date: anchor },
      update: {},
      create: { date: anchor },
      select: { id: true },
    });
    data.dayId = day.id;
  }

  return NextResponse.json(await prisma.task.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
