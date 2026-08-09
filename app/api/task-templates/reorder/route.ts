import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const { ids } = (await request.json()) as { ids: string[] };

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.task.update({ where: { id }, data: { order: index } }),
    ),
  );

  return NextResponse.json({ ok: true });
}
