import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { status, rating, notes, totalPages, currentPage } =
    await request.json();

  const current = await prisma.book.findUniqueOrThrow({ where: { id } });

  const nextTotalPages =
    totalPages !== undefined ? totalPages : current.totalPages;

  const book = await prisma.book.update({
    where: { id },
    data: {
      status,
      rating,
      notes,
      totalPages,
      currentPage:
        status === "LIDO"
          ? (nextTotalPages ?? current.totalPages)
          : currentPage,
      startedAt:
        status === "LENDO" && !current.startedAt ? new Date() : undefined,
      finishedAt: status === "LIDO" ? new Date() : undefined,
    },
  });

  return NextResponse.json(book);
}
