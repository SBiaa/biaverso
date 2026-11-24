import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, route } from "@/lib/api";
import { timeEntryStopSchema } from "@/lib/schemas";
import { serializeTimeEntry } from "@/lib/time-tracking";

type Params = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  // Corpo é opcional: sem ele, encerra agora.
  const { endedAt: requestedEnd } = timeEntryStopSchema.parse(
    await request.json().catch(() => ({})),
  );

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) throw new ApiError(404, "Registro não encontrado.");
  if (entry.endedAt) throw new ApiError(409, "Esse registro já foi encerrado.");

  // O ciclo do pomodoro acaba na hora certa mesmo com a aba fechada: quem
  // reabre manda o fim real, e ele nunca fica antes do início nem no futuro.
  const now = new Date();
  const endedAt = requestedEnd
    ? new Date(Math.min(Math.max(requestedEnd.getTime(), entry.startedAt.getTime()), now.getTime()))
    : now;

  return NextResponse.json(
    serializeTimeEntry(await prisma.timeEntry.update({ where: { id }, data: { endedAt } })),
  );
});
