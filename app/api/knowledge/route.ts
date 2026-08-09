import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { title, source, type, area, summary, link } = await request.json();

  const item = await prisma.knowledge.create({
    data: {
      title,
      source: source || null,
      type,
      area,
      summary: summary || null,
      link: link || null,
    },
  });

  return NextResponse.json(item);
}
