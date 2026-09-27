import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, route } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export const POST = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) throw new ApiError(404, "Registro não encontrado.");
  if (entry.endedAt) throw new ApiError(409, "Esse registro já foi encerrado.");

  return NextResponse.json(
    await prisma.timeEntry.update({ where: { id }, data: { endedAt: new Date() } }),
  );
});
