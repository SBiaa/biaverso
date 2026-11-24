import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { postCoverSchema } from "@/lib/schemas";
import { dataUrlImageResponse } from "@/lib/image-response";

type Params = { params: Promise<{ id: string }> };

/** Capa do post no Feed, como arquivo (ver `dataUrlImageResponse`). */
export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const cover = await prisma.contentPostCover.findUnique({ where: { postId: id } });
  return dataUrlImageResponse(cover?.image);
});

export const PUT = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { image } = await parseBody(request, postCoverSchema);
  const cover = await prisma.contentPostCover.upsert({
    where: { postId: id },
    create: { postId: id, image },
    update: { image },
    select: { updatedAt: true },
  });
  return NextResponse.json({ version: cover.updatedAt.getTime() });
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.contentPostCover.deleteMany({ where: { postId: id } });
  return NextResponse.json({ ok: true });
});
