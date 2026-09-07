import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { ingredientPatchSchema } from "@/lib/schemas";
import type { Prisma } from "@/app/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const body = await parseBody(request, ingredientPatchSchema);

  // Só o que veio no corpo muda: marcar "tem em casa" não pode apagar a nota.
  const data: Prisma.IngredientUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.inStock !== undefined) data.inStock = body.inStock;
  if (body.notes !== undefined) data.notes = body.notes || null;

  return NextResponse.json(await prisma.ingredient.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // As receitas que usavam o item perdem só essa linha (onDelete: Cascade).
  await prisma.ingredient.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
