import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { businessPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, businessPatchSchema);
  return NextResponse.json(await prisma.business.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Projetos, vinculos de cliente, posts e tarefas de producao do negocio somem
  // junto (onDelete: Cascade). Transacoes e ideias soltam o vinculo (SetNull).
  await prisma.business.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
