import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { careRoutineStepPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string; stepId: string }> };

/** Garante que o passo é mesmo da rotina da URL antes de mexer nele. */
async function assertBelongs(stepId: string, routineId: string) {
  const step = await prisma.careRoutineStep.findUnique({
    where: { id: stepId },
    select: { routineId: true },
  });
  if (!step || step.routineId !== routineId) {
    throw new ApiError(404, "Passo não encontrado nesta rotina.");
  }
}

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id, stepId } = await params;
  const data = await parseBody(request, careRoutineStepPatchSchema);
  await assertBelongs(stepId, id);

  return NextResponse.json(
    await prisma.careRoutineStep.update({ where: { id: stepId }, data }),
  );
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id, stepId } = await params;
  await assertBelongs(stepId, id);

  await prisma.careRoutineStep.delete({ where: { id: stepId } });
  return NextResponse.json({ ok: true });
});
