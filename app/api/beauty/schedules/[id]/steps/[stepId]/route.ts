import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { careScheduleStepPatchSchema } from "@/lib/schemas";
import { safeStepIndex } from "@/lib/beleza-shared";

type Params = { params: Promise<{ id: string; stepId: string }> };

async function assertBelongs(stepId: string, scheduleId: string) {
  const step = await prisma.careScheduleStep.findUnique({
    where: { id: stepId },
    select: { scheduleId: true },
  });
  if (!step || step.scheduleId !== scheduleId) {
    throw new ApiError(404, "Etapa não encontrada neste cronograma.");
  }
}

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id, stepId } = await params;
  const data = await parseBody(request, careScheduleStepPatchSchema);
  await assertBelongs(stepId, id);

  return NextResponse.json(
    await prisma.careScheduleStep.update({ where: { id: stepId }, data }),
  );
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id, stepId } = await params;
  await assertBelongs(stepId, id);

  await prisma.careScheduleStep.delete({ where: { id: stepId } });

  // O ciclo encurtou: sem isto o `currentStep` podia apontar para fora da lista
  // e o cronograma ficava sem "próxima etapa" na tela.
  const [schedule, remaining] = await Promise.all([
    prisma.careSchedule.findUniqueOrThrow({
      where: { id },
      select: { currentStep: true },
    }),
    prisma.careScheduleStep.count({ where: { scheduleId: id } }),
  ]);

  await prisma.careSchedule.update({
    where: { id },
    data: { currentStep: safeStepIndex(schedule.currentStep, remaining) },
  });

  return NextResponse.json({ ok: true });
});
