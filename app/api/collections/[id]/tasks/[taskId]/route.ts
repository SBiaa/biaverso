import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { collectionTaskPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string; taskId: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id, taskId } = await params;
  const { done, ...patch } = await parseBody(request, collectionTaskPatchSchema);

  const task = await prisma.collectionTask.update({
    where: { id: taskId, collectionId: id },
    data: {
      ...patch,
      done,
      // Marcar concluída carimba a data; desmarcar limpa. Sem isso a tarefa
      // reaberta continuava com a data da conclusão antiga.
      completedAt: done === undefined ? undefined : done ? new Date() : null,
    },
  });

  return NextResponse.json(task);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id, taskId } = await params;
  await prisma.collectionTask.delete({ where: { id: taskId, collectionId: id } });
  return NextResponse.json({ ok: true });
});
