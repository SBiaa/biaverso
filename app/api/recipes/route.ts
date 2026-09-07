import { NextResponse } from "next/server";
import { parseBody, route } from "@/lib/api";
import { recipeSchema } from "@/lib/schemas";
import { saveRecipe } from "@/lib/receitas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, recipeSchema);
  return NextResponse.json(await saveRecipe(data));
});
