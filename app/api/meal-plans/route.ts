import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { mealPlanSchema } from "@/lib/schemas";

export const PUT = route(async (request: Request) => {
  const { weekStart, dayOfWeek, mealType, recipeId, optionIngredientId } = await parseBody(
    request,
    mealPlanSchema,
  );
  // Sem prato não há opção: tirar a receita limpa também o "com frango".
  const data = {
    recipeId: recipeId ?? null,
    optionIngredientId: recipeId ? (optionIngredientId ?? null) : null,
  };

  // Upsert na unique composta — o findFirst + create anterior deixava duas abas
  // criarem dois planos para o mesmo horario.
  const plan = await prisma.mealPlan.upsert({
    where: { weekStart_dayOfWeek_mealType: { weekStart, dayOfWeek, mealType } },
    create: { weekStart, dayOfWeek, mealType, ...data },
    update: data,
  });

  return NextResponse.json(plan);
});
