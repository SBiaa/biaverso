import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { contentPostPatchSchema } from "@/lib/schemas";
import { linkClientToBusiness, resolvePostCompletedAt } from "@/lib/ace";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { completedAt, status, ...patch } = await parseBody(request, contentPostPatchSchema);

  const existing = await prisma.contentPost.findUniqueOrThrow({ where: { id } });

  const post = await prisma.contentPost.update({
    where: { id },
    data: {
      ...patch,
      status,
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
