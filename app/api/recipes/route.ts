import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { recipeSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, recipeSchema);
  return NextResponse.json(
    await prisma.recipe.create({ data: { ...data, prepTime: data.prepTime ?? null } }),
  );
});
