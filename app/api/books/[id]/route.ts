import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { status, rating, notes } = await request.json();

  const current = await prisma.book.findUniqueOrThrow({ where: { id } });

  const book = await prisma.book.update({
    where: { id },
    data: {
      status,
      rating,
      notes,
      startedAt:
        status === "LENDO" && !current.startedAt ? new Date() : undefined,
      finishedAt: status === "LIDO" ? new Date() : undefined,
    },
  });

  return NextResponse.json(book);
}
