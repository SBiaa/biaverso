import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePostCompletedAt } from "@/lib/ace";
import type { Prisma } from "@/app/generated/prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const clientId = searchParams.get("clientId");
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const network = searchParams.get("network");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const posts = await prisma.contentPost.findMany({
    where: {
      businessId: businessId || undefined,
      clientId: clientId || undefined,
      projectId: projectId || undefined,
      status: status ? (status as Prisma.ContentPostWhereInput["status"]) : undefined,
      type: type ? (type as Prisma.ContentPostWhereInput["type"]) : undefined,
      network: network ? (network as Prisma.ContentPostWhereInput["network"]) : undefined,
      publishDate:
        from || to
          ? {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            }
          : undefined,
    },
    include: { client: true, project: true },
    orderBy: { publishDate: "asc" },
  });

  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const {
    title,
    type,
    network,
    status,
    publishDate,
    completedAt,
    businessId,
    clientId,
    projectId,
    caption,
    notes,
  } = await request.json();

  const resolvedStatus = status || "PLANEJADO";

  const post = await prisma.contentPost.create({
    data: {
      title,
      type,
      network,
      status: resolvedStatus,
      publishDate: publishDate ? new Date(publishDate) : null,
      completedAt: resolvePostCompletedAt(resolvedStatus, completedAt, null),
      caption: caption || null,
      notes: notes || null,
      businessId,
      clientId,
      projectId: projectId || null,
    },
  });

  return NextResponse.json(post);
}
