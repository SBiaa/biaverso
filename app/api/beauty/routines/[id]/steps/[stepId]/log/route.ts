import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { careRoutineLogSchema } from "@/lib/schemas";
import { todayUtc } from "@/lib/utils";

type Params = { params: Promise<{ id: string; stepId: string }> };

/**
 * Marca/desmarca um passo da rotina numa data, e recalcula a rotina inteira:
 * marcar o último passo fecha a rotina, desmarcar qualquer um reabre. Assim os
 * dois checks — o do passo e o da rotina — nunca contam histórias diferentes.
 */
export const POST = route(async (request: Request, { params }: Params) => {
  const { id, stepId } = await params;
  const { date, done } = await parseBody(request, careRoutineLogSchema);
  const logDate = date ?? todayUtc();

  const steps = await prisma.careRoutineStep.findMany({
    where: { routineId: id },
    select: { id: true },
  });
  if (!steps.some((s) => s.id === stepId)) {
    throw new ApiError(404, "Esse passo não é dessa rotina.");
  }

  const log = await prisma.careRoutineStepLog.upsert({
    where: { stepId_date: { stepId, date: logDate } },
    update: { done },
    create: { stepId, date: logDate, done },
  });

  const doneCount = await prisma.careRoutineStepLog.count({
    where: { date: logDate, done: true, stepId: { in: steps.map((s) => s.id) } },
  });
  const routineDone = doneCount === steps.length;

  await prisma.careRoutineLog.upsert({
    where: { routineId_date: { routineId: id, date: logDate } },
    update: { done: routineDone },
    create: { routineId: id, date: logDate, done: routineDone },
  });

  return NextResponse.json({ ...log, routineDone });
});
