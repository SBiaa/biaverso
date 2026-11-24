import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { careRoutineStepCreateSchema, stepsReorderSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const steps = await prisma.careRoutineStep.findMany({
    where: { routineId: id },
    orderBy: { order: "asc" },
    include: { product: { select: { name: true } } },
  });
  return NextResponse.json(steps);
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, careRoutineStepCreateSchema);

  const count = await prisma.careRoutineStep.count({ where: { routineId: id } });

  return NextResponse.json(
    await prisma.careRoutineStep.create({
      data: { ...data, order: count, routineId: id },
    }),
  );
});

/** Reordenação por arrastar: a posição de cada id no array vira o `order`. */
export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { ids } = await parseBody(request, stepsReorderSchema);

  // `updateMany` com o routineId no where: id de outra rotina não passa.
  await prisma.$transaction(
    ids.map((stepId, index) =>
      prisma.careRoutineStep.updateMany({
        where: { id: stepId, routineId: id },
        data: { order: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
});
