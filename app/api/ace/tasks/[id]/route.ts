import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { productionTaskPatchSchema } from "@/lib/schemas";
import { linkClientToBusiness, resolveTaskCompletedAt } from "@/lib/ace";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { completedAt, status, ...patch } = await parseBody(request, productionTaskPatchSchema);

  const existing = await prisma.productionTask.findUniqueOrThrow({ where: { id } });

  const task = await prisma.productionTask.update({
    where: { id },
    data: {
      ...patch,
      status,
      completedAt:
        status !== undefined
          ? resolveTaskCompletedAt(status, completedAt, existing.completedAt)
          : completedAt,
    },
  });

  // Trocar para um cliente de outro negócio também cria o vínculo aqui.
  if (task.clientId && task.clientId !== existing.clientId) {
    await linkClientToBusiness(task.clientId, task.businessId);
  }

  return NextResponse.json(task);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.productionTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
