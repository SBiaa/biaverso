import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePostCompletedAt } from "@/lib/ace";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const {
    title,
    type,
    network,
    status,
    publishDate,
    completedAt,
    clientId,
    projectId,
    caption,
    notes,
  } = await request.json();

  const existing = await prisma.contentPost.findUniqueOrThrow({ where: { id } });

  const post = await prisma.contentPost.update({
    where: { id },
    data: {
      title,
      type,
      network,
      status,
      caption,
      notes,
      clientId,
      publishDate:
        publishDate !== undefined ? (publishDate ? new Date(publishDate) : null) : undefined,
      projectId: projectId !== undefined ? projectId || null : undefined,
      completedAt:
        status !== undefined
          ? resolvePostCompletedAt(status, completedAt, existing.completedAt)
          : completedAt !== undefined
            ? completedAt
              ? new Date(completedAt)
              : null
            : undefined,
    },
  });

  return NextResponse.json(post);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.contentPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
