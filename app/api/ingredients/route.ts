import { NextResponse } from "next/server";
import { parseBody, route } from "@/lib/api";
import { ingredientCreateSchema } from "@/lib/schemas";
import { createIngredient } from "@/lib/receitas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, ingredientCreateSchema);
  return NextResponse.json(await createIngredient(data));
});
