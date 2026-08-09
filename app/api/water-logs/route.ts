import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const { dayId, count } = await request.json();

  const current = await prisma.waterLog.findMany({
    where: { dayId },
    orderBy: { loggedAt: "asc" },
  });

  if (count > current.length) {
    await prisma.waterLog.createMany({
      data: Array.from({ length: count - current.length }, () => ({ dayId })),
    });
  } else if (count < current.length) {
    const toRemove = current.slice(count).map((log) => log.id);
    await prisma.waterLog.deleteMany({ where: { id: { in: toRemove } } });
  }

  return NextResponse.json({ count });
}
