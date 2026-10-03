import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { priorityLevelPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, priorityLevelPatchSchema);
  return NextResponse.json(await prisma.priorityLevel.update({ where: { id }, data }));
});

// Apagar um nível não apaga tarefa: ela volta a ficar sem prioridade (SetNull).
export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.priorityLevel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
