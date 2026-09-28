import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { activityCategoryPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, activityCategoryPatchSchema);
  return NextResponse.json(await prisma.activityCategory.update({ where: { id }, data }));
});

// Categoria com bloco/registro ligado não pode ser apagada (onDelete: Restrict) —
// o Prisma recusa com P2003, que lib/api.ts já traduz para 409. A tela deixa
// desativar em vez de apagar nesse caso.
export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.activityCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
