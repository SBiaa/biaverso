import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { contentPostPatchSchema } from "@/lib/schemas";
import { linkClientToBusiness, resolvePostCompletedAt } from "@/lib/ace";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { completedAt, status, pinned, ...patch } = await parseBody(
    request,
    contentPostPatchSchema,
  );

  const existing = await prisma.contentPost.findUniqueOrThrow({ where: { id } });

  // Fixar de novo um post já fixado não mexe na data: ele perderia o lugar.
  let pinnedAt: Date | null | undefined;
  if (pinned === false) pinnedAt = null;
  if (pinned === true && !existing.pinnedAt) {
    const pinnedCount = await prisma.contentPost.count({
      where: {
        businessId: existing.businessId,
        clientId: existing.clientId,
        pinnedAt: { not: null },
        status: { not: "CANCELADO" },
      },
    });
    if (pinnedCount >= 3) {
      throw new ApiError(400, "O Instagram só deixa fixar 3 posts. Desafixe um antes.");
    }
    pinnedAt = new Date();
  }

  const post = await prisma.contentPost.update({
    where: { id },
    data: {
      ...patch,
      status,
      pinnedAt,
      completedAt:
        status !== undefined
          ? resolvePostCompletedAt(status, completedAt, existing.completedAt)
          : completedAt,
    },
  });

  // Trocar para um cliente de outro negócio também cria o vínculo aqui.
  if (post.clientId && post.clientId !== existing.clientId) {
    await linkClientToBusiness(post.clientId, post.businessId);
  }

  return NextResponse.json(post);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.contentPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
