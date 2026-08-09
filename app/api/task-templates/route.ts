import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { title, type } = await request.json();

  const count = await prisma.task.count({ where: { dayId: null, type } });

  const template = await prisma.task.create({
    data: {
      title,
      type,
      origin: "CASA",
      order: count,
    },
  });

  return NextResponse.json(template);
}
