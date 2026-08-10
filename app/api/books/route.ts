import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { bookCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, bookCreateSchema);

  const book = await prisma.book.create({
    data: {
      ...data,
      totalPages: data.totalPages ?? null,
      currentPage: data.currentPage ?? null,
    },
  });

  return NextResponse.json(book);
});
