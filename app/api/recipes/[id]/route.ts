import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { recipeSchema } from "@/lib/schemas";
import { saveRecipe } from "@/lib/receitas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, recipeSchema);
  return NextResponse.json(await saveRecipe(data, id));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Planos e logs perdem a referencia mas nao somem (onDelete: SetNull).
  // Os itens da receita somem junto; os ingredientes ficam na despensa.
  await prisma.recipe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
