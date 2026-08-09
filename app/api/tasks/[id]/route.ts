import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { done } = await request.json();

  const task = await prisma.task.update({
    where: { id },
    data: { done },
  });

  return NextResponse.json(task);
}
