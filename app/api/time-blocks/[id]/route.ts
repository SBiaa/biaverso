import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { timeBlockPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const body = await parseBody(request, timeBlockPatchSchema);

  const current = await prisma.timeBlock.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, "Bloco não encontrado.");

  const startTime = body.startTime ?? current.startTime;
  const endTime = body.endTime ?? current.endTime;
  if (endTime <= startTime) {
    throw new ApiError(400, "O fim do bloco precisa ser depois do início.");
  }

  return NextResponse.json(await prisma.timeBlock.update({ where: { id }, data: body }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.timeBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
