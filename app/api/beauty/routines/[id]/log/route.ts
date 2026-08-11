import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { careRoutineLogSchema } from "@/lib/schemas";
import { todayUtc } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

/**
 * Marca/desmarca a rotina numa data. É upsert por causa do `@@unique
 * ([routineId, date])`: desmarcar e marcar de novo no mesmo dia reaproveita a
 * linha em vez de estourar P2002.
 */
export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { date, done } = await parseBody(request, careRoutineLogSchema);
  const logDate = date ?? todayUtc();

  const log = await prisma.careRoutineLog.upsert({
    where: { routineId_date: { routineId: id, date: logDate } },
    update: { done },
    create: { routineId: id, date: logDate, done },
  });

  return NextResponse.json(log);
});
