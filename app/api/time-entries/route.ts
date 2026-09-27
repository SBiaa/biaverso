import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { timeEntryCreateSchema } from "@/lib/schemas";
import { combineDateAndTime } from "@/lib/utils";

// Registro manual de tempo já concluído — para quando esqueceu de apertar
// "iniciar". O cronômetro em si fica em /api/time-entries/start.
export const POST = route(async (request: Request) => {
  const { dayId, categoryId, title, startTime, endTime } = await parseBody(
    request,
    timeEntryCreateSchema,
  );

  const day = await prisma.day.findUnique({ where: { id: dayId } });
  if (!day) throw new ApiError(404, "Dia não encontrado.");

  const startedAt = combineDateAndTime(day.date, startTime);
  const endedAt = combineDateAndTime(day.date, endTime);
  if (endedAt <= startedAt) {
    throw new ApiError(400, "O fim precisa ser depois do início.");
  }

  const entry = await prisma.timeEntry.create({
    data: { dayId, categoryId, title, startedAt, endedAt },
  });

  return NextResponse.json(entry);
});
