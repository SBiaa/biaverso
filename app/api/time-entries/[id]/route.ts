import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { timeEntryPatchSchema } from "@/lib/schemas";
import { combineDateAndTime } from "@/lib/utils";
import type { Prisma } from "@/app/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

// Corrige um registro (categoria, título ou horário) — o dia do registro não
// muda, só a hora dentro dele.
export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const body = await parseBody(request, timeEntryPatchSchema);

  const entry = await prisma.timeEntry.findUnique({ where: { id }, include: { day: true } });
  if (!entry) throw new ApiError(404, "Registro não encontrado.");

  const data: Prisma.TimeEntryUncheckedUpdateInput = {};
  if (body.categoryId !== undefined) data.categoryId = body.categoryId;
  if (body.title !== undefined) data.title = body.title;

  if (body.startTime !== undefined || body.endTime !== undefined) {
    const startedAt = body.startTime
      ? combineDateAndTime(entry.day.date, body.startTime)
      : entry.startedAt;
    const endedAt = body.endTime
      ? combineDateAndTime(entry.day.date, body.endTime)
      : entry.endedAt;

    if (endedAt && endedAt <= startedAt) {
      throw new ApiError(400, "O fim precisa ser depois do início.");
    }

    data.startedAt = startedAt;
    if (body.endTime !== undefined) data.endedAt = endedAt;
  }

  return NextResponse.json(await prisma.timeEntry.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
