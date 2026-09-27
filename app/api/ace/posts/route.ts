import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery, route } from "@/lib/api";
import { aceListQuerySchema, contentPostCreateSchema } from "@/lib/schemas";
import { linkClientToBusiness, resolvePostCompletedAt, scopeClientFilter } from "@/lib/ace";
import type { Prisma } from "@/app/generated/prisma/client";

export const GET = route(async (request: Request) => {
  const q = parseQuery(request, aceListQuerySchema);

  const posts = await prisma.contentPost.findMany({
    where: {
      businessId: q.businessId,
      // Um cliente específico já é mais restrito que qualquer escopo.
      clientId: q.clientId ?? scopeClientFilter(q.scope),
      projectId: q.projectId,
      status: q.status as Prisma.ContentPostWhereInput["status"],
      type: q.type as Prisma.ContentPostWhereInput["type"],
      network: q.network,
      publishDate: q.from || q.to ? { gte: q.from, lte: q.to } : undefined,
    },
    include: { client: true, project: true },
    orderBy: { publishDate: "asc" },
  });

  return NextResponse.json(posts);
});

export const POST = route(async (request: Request) => {
  const { completedAt, ...data } = await parseBody(request, contentPostCreateSchema);

  const post = await prisma.contentPost.create({
    data: {
      ...data,
      publishDate: data.publishDate ?? null,
      projectId: data.projectId ?? null,
      completedAt: resolvePostCompletedAt(data.status, completedAt, null),
    },
  });

  // O select de cliente lista todo mundo, não só quem já era do negócio: quem
  // veio de fora ganha o vínculo agora.
  if (post.clientId) {
    await linkClientToBusiness(post.clientId, post.businessId);
  }

  return NextResponse.json(post);
});
