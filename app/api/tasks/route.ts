import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { title, origin, dayId, dueDate } = await request.json();

  const task = await prisma.task.create({
    data: {
      title,
      origin,
      dayId,
      dueDate: dueDate ? new Date(dueDate) : null,
      type: "AVULSA",
    },
  });

  return NextResponse.json(task);
}
