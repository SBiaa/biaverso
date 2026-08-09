import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { title, author, status } = await request.json();

  const book = await prisma.book.create({
    data: {
      title,
      author: author || null,
      status: status || "QUERO_LER",
    },
  });

  return NextResponse.json(book);
}
