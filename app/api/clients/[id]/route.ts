import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { clientPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, clientPatchSchema);
  return NextResponse.json(await prisma.client.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Vinculos, posts e tarefas de producao do cliente somem junto (Cascade);
  // os projetos ficam, sem cliente (SetNull).
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
