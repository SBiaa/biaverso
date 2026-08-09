import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { eaten } = await request.json();

  const log = await prisma.mealLog.update({
    where: { id },
    data: { eaten },
  });

  return NextResponse.json(log);
}
