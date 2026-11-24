import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { prospectTaskPatchSchema } from "@/lib/schemas";
import { applyStepDone } from "@/lib/prospect";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { done, ...patch } = await parseBody(request, prospectTaskPatchSchema);

  const before = await prisma.prospectTask.findUniqueOrThrow({
    where: { id },
    select: { done: true, key: true, clientBusinessId: true },
  });

  const task = await prisma.prospectTask.update({
    where: { id },
    data: {
      ...patch,
      done,
      // Marcar concluído carimba a data; desmarcar limpa.
      completedAt: done === undefined ? undefined : done ? new Date() : null,
    },
  });

  if (done && !before.done) await applyStepDone(before.clientBusinessId, before.key);

  return NextResponse.json(task);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.prospectTask.delete({ where: { id } });
  // O foco do dia guarda só o id, sem chave estrangeira.
  await prisma.dayFocus.deleteMany({ where: { kind: "prospect", taskId: id } });
  return NextResponse.json({ ok: true });
});
