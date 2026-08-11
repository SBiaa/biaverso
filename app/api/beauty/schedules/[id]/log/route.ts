import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { careScheduleLogSchema } from "@/lib/schemas";
import { nextStepIndex, safeStepIndex } from "@/lib/beleza-shared";
import { todayUtc } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

/**
 * Registra a etapa da vez e gira o ciclo: grava o log e move `currentStep` para
 * o próximo passo, voltando ao começo quando chega no fim.
 */
export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { date, stepId, notes } = await parseBody(request, careScheduleLogSchema);

  const schedule = await prisma.careSchedule.findUniqueOrThrow({
    where: { id },
    select: {
      currentStep: true,
      steps: { orderBy: { order: "asc" }, select: { id: true } },
    },
  });

  if (schedule.steps.length === 0) {
    throw new ApiError(400, "Adicione pelo menos uma etapa antes de registrar o ciclo.");
  }

  const currentIndex = safeStepIndex(schedule.currentStep, schedule.steps.length);
  // Sem `stepId` no corpo vale a etapa da vez; com ele, a tela está corrigindo
  // uma etapa fora de ordem — mas só entre as etapas deste cronograma.
  const loggedStepId = stepId ?? schedule.steps[currentIndex].id;
  const loggedIndex = schedule.steps.findIndex((s) => s.id === loggedStepId);

  if (loggedIndex === -1) {
    throw new ApiError(404, "Etapa não encontrada neste cronograma.");
  }

  const [log] = await prisma.$transaction([
    prisma.careScheduleLog.create({
      data: {
        scheduleId: id,
        stepId: loggedStepId,
        date: date ?? todayUtc(),
        notes: notes ?? null,
      },
    }),
    prisma.careSchedule.update({
      where: { id },
      data: { currentStep: nextStepIndex(loggedIndex, schedule.steps.length) },
    }),
  ]);

  return NextResponse.json(log);
});
