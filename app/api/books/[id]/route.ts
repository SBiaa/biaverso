import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { bookPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const patch = await parseBody(request, bookPatchSchema);

  const current = await prisma.book.findUniqueOrThrow({ where: { id } });

  const nextStatus = patch.status ?? current.status;
  const nextTotalPages = patch.totalPages ?? current.totalPages;

  // Terminar o livro leva a leitura para a última página; sair de "Lido"
  // devolve a data de conclusão para nulo em vez de deixá-la presa.
  const becameRead = nextStatus === "LIDO" && current.status !== "LIDO";
  const leftRead = nextStatus !== "LIDO" && current.status === "LIDO";

  const book = await prisma.book.update({
    where: { id },
    data: {
      status: patch.status,
      rating: patch.rating,
      notes: patch.notes,
      totalPages: patch.totalPages,
      currentPage: nextStatus === "LIDO" ? nextTotalPages : patch.currentPage,
      startedAt: nextStatus === "LENDO" && !current.startedAt ? new Date() : undefined,
      finishedAt: becameRead ? new Date() : leftRead ? null : undefined,
    },
  });

  return NextResponse.json(book);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.book.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
