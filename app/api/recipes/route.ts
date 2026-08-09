import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { title, category, description, ingredients, steps, prepTime } =
    await request.json();

  const recipe = await prisma.recipe.create({
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
