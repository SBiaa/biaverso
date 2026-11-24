import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { careScheduleStepCreateSchema, stepsReorderSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const steps = await prisma.careScheduleStep.findMany({
    where: { scheduleId: id },
    orderBy: { order: "asc" },
    include: { product: { select: { name: true } } },
  });
  return NextResponse.json(steps);
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, careScheduleStepCreateSchema);

  const count = await prisma.careScheduleStep.count({ where: { scheduleId: id } });

  return NextResponse.json(
    await prisma.careScheduleStep.create({
      data: { ...data, order: count, scheduleId: id },
    }),
  );
});

/** Reordenação do ciclo: a posição de cada id no array vira o `order`. */
export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { ids } = await parseBody(request, stepsReorderSchema);

  await prisma.$transaction(
    ids.map((stepId, index) =>
      prisma.careScheduleStep.updateMany({
        where: { id: stepId, scheduleId: id },
        data: { order: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
});
