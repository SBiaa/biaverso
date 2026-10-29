import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { timeEntryPatchSchema } from "@/lib/schemas";
import { combineDateAndTime } from "@/lib/utils";
import { resolveEntryLinks, serializeTimeEntry } from "@/lib/time-tracking";
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
  if (body.description !== undefined) data.description = body.description;
  if (body.projectId !== undefined || body.taskId !== undefined) {
    // Trocar de projeto sem dizer a tarefa solta a tarefa antiga.
    const nextProjectId = body.projectId === undefined ? entry.projectId : body.projectId;
    const nextTaskId =
      body.taskId !== undefined
        ? body.taskId
        : body.projectId !== undefined
          ? null
          : entry.taskId;
    const links = await resolveEntryLinks(nextProjectId, nextTaskId);
    data.projectId = links.projectId;
    data.taskId = links.taskId;
  }

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

  return NextResponse.json(
    serializeTimeEntry(await prisma.timeEntry.update({ where: { id }, data })),
  );
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
