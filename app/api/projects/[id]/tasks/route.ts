import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { title, dueDate } = await request.json();

  const project = await prisma.project.findUniqueOrThrow({ where: { id } });

  const task = await prisma.task.create({
    data: {
      title,
      type: "AVULSA",
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId: project.id,
      businessId: project.businessId,
    },
  });

  return NextResponse.json(task);
}
