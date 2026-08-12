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

  if (patch.done !== undefined) {
    data.done = patch.done;
    // Desmarcar limpa a data: senão uma tarefa reaberta continuaria contando
    // como sinal de vida do projeto no dia da primeira conclusão.
    data.completedAt = patch.done ? new Date() : null;
  }

  if (patch.dueDate !== undefined) {
    data.dueDate = patch.dueDate;

    // Pendurar no Day é o que faz a tarefa aparecer no /dia — sem isso, o
    // "trazer para hoje" do radar mudaria o prazo e nada apareceria na tela.
    if (patch.dueDate) {
      const day = await prisma.day.upsert({
        where: { date: patch.dueDate },
        update: {},
        create: { date: patch.dueDate },
        select: { id: true },
      });
      data.dayId = day.id;
    }
  }

  return NextResponse.json(await prisma.task.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
