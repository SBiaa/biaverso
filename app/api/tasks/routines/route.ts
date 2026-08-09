import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const routines = await prisma.task.findMany({
    where: { dayId: null, type: { in: ["ROTINA_NORMAL", "ROTINA_FAXINA"] } },
    orderBy: { order: "asc" },
    select: { id: true, title: true, type: true, order: true },
  });

  return NextResponse.json(routines);
}

export async function POST(request: Request) {
  const { title, type, order } = await request.json();

  const count = await prisma.task.count({ where: { dayId: null, type } });

  const routine = await prisma.task.create({
    data: {
      title,
      type,
      origin: "CASA",
      order: order ?? count,
    },
  });

  return NextResponse.json(routine);
}
