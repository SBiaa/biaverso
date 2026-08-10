import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { recipeSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, recipeSchema);
  return NextResponse.json(
    await prisma.recipe.update({ where: { id }, data: { ...data, prepTime: data.prepTime ?? null } }),
  );
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Planos e logs perdem a referencia mas nao somem (onDelete: SetNull).
  await prisma.recipe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
