import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTaskCompletedAt } from "@/lib/ace";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const {
    title,
    type,
    description,
    priority,
    status,
    dueDate,
    completedAt,
    clientId,
    projectId,
    notes,
  } = await request.json();

  const existing = await prisma.productionTask.findUniqueOrThrow({ where: { id } });

  const task = await prisma.productionTask.update({
    where: { id },
    data: {
      title,
      type,
      description,
      priority,
      status,
      notes,
      clientId,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      projectId: projectId !== undefined ? projectId || null : undefined,
      completedAt:
        status !== undefined
          ? resolveTaskCompletedAt(status, completedAt, existing.completedAt)
          : completedAt !== undefined
            ? completedAt
              ? new Date(completedAt)
              : null
            : undefined,
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.productionTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
