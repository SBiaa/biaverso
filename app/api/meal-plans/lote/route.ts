import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { mealPlanBatchSchema } from "@/lib/schemas";

/** "Preencher a semana": grava os horários sorteados de uma vez só. */
export const PUT = route(async (request: Request) => {
  const { plans } = await parseBody(request, mealPlanBatchSchema);

  const saved = await prisma.$transaction(
    plans.map(({ weekStart, dayOfWeek, mealType, recipeId, optionIngredientId }) => {
      const data = {
        recipeId: recipeId ?? null,
        optionIngredientId: recipeId ? (optionIngredientId ?? null) : null,
      };
      return prisma.mealPlan.upsert({
        where: { weekStart_dayOfWeek_mealType: { weekStart, dayOfWeek, mealType } },
        create: { weekStart, dayOfWeek, mealType, ...data },
        update: data,
      });
    }),
  );

  return NextResponse.json({ count: saved.length });
});
