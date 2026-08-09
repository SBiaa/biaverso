import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { title, category, description, ingredients, steps, prepTime } =
    await request.json();

  const recipe = await prisma.recipe.update({
    where: { id },
    data: {
      title,
      category,
      description: description || null,
      ingredients,
      steps,
      prepTime: prepTime ? Number(prepTime) : null,
    },
  });

  return NextResponse.json(recipe);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await prisma.$transaction([
    prisma.mealPlan.updateMany({
      where: { recipeId: id },
      data: { recipeId: null },
    }),
    prisma.mealLog.updateMany({
      where: { recipeId: id },
      data: { recipeId: null },
    }),
    prisma.recipe.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
