import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { businessCoverSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

/**
 * A imagem em si, como arquivo. As telas apontam um <img> para cá com
 * `?v=<quando mudou>`, então o navegador guarda a capa e só baixa de novo
 * quando ela é trocada — a imagem não viaja junto com a página.
 */
export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const cover = await prisma.businessCover.findUnique({ where: { businessId: id } });
  if (!cover) return new NextResponse(null, { status: 404 });

  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(cover.image);
  if (!match) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});

export const PUT = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { image } = await parseBody(request, businessCoverSchema);
  const cover = await prisma.businessCover.upsert({
    where: { businessId: id },
    create: { businessId: id, image },
    update: { image },
    select: { updatedAt: true },
  });
  return NextResponse.json({ version: cover.updatedAt.getTime() });
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.businessCover.deleteMany({ where: { businessId: id } });
  return NextResponse.json({ ok: true });
});
