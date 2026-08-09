import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { effectiveness, highlights, improvements, nextMonthGoal } =
    await request.json();

  const review = await prisma.monthReview.update({
    where: { id },
    data: { effectiveness, highlights, improvements, nextMonthGoal },
  });

  return NextResponse.json(review);
}
