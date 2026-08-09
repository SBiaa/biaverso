import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name, description, color, icon, order } = await request.json();

  const pillar = await prisma.pillar.update({
    where: { id },
    data: { name, description, color, icon, order },
  });

  return NextResponse.json(pillar);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await prisma.$transaction([
    prisma.moodboardItem.deleteMany({ where: { pillarId: id } }),
    prisma.measuredGoal.deleteMany({ where: { conceptualGoal: { pillarId: id } } }),
    prisma.conceptualGoal.deleteMany({ where: { pillarId: id } }),
    prisma.pillar.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
