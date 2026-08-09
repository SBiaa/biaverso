import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { highlights, improvements, nextQuarterGoal } = await request.json();

  const review = await prisma.quarterReview.update({
    where: { id },
    data: { highlights, improvements, nextQuarterGoal },
  });

  return NextResponse.json(review);
}
