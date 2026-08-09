import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { type, content, caption, order } = await request.json();

  const item = await prisma.moodboardItem.update({
    where: { id },
    data: { type, content, caption, order },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.moodboardItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
