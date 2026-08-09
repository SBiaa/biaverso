import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { title, description, pillarId } = await request.json();

  const desire = await prisma.desire.update({
    where: { id },
    data: { title, description, pillarId },
  });

  return NextResponse.json(desire);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.desire.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
