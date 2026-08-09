import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const { weekStart, dayOfWeek, mealType, recipeId } = await request.json();

  const existing = await prisma.mealPlan.findFirst({
    where: { weekStart: new Date(weekStart), dayOfWeek, mealType },
  });

  const plan = existing
    ? await prisma.mealPlan.update({
        where: { id: existing.id },
        data: { recipeId },
      })
    : await prisma.mealPlan.create({
        data: {
          weekStart: new Date(weekStart),
          dayOfWeek,
          mealType,
          recipeId,
        },
      });

  return NextResponse.json(plan);
}
