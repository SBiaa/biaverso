import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { title, body, pillarId } = await request.json();

  const principle = await prisma.principle.update({
    where: { id },
    data: { title, body, pillarId },
  });

  return NextResponse.json(principle);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.principle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
