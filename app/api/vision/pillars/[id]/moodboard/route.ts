import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const items = await prisma.moodboardItem.findMany({
    where: { pillarId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { type, content, caption } = await request.json();

  const count = await prisma.moodboardItem.count({ where: { pillarId: id } });

  const item = await prisma.moodboardItem.create({
    data: {
      type,
      content,
      caption: caption || null,
      order: count,
      pillarId: id,
    },
  });

  return NextResponse.json(item);
}
