import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const {
    effectiveness,
    energy,
    biggestBlock,
    executedPlan,
    foodHydration,
    houseUpToDate,
    notes,
    nextWeekFocus,
  } = await request.json();

  const review = await prisma.weekReview.update({
    where: { id },
    data: {
      effectiveness,
      energy,
      biggestBlock,
      executedPlan,
      foodHydration,
      houseUpToDate,
      notes,
      nextWeekFocus,
    },
  });

  return NextResponse.json(review);
}
