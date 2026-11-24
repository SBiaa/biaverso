import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { collectionPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const collection = await prisma.collection.findUniqueOrThrow({
    where: { id },
    include: { products: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(collection);
});

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, collectionPatchSchema);

  return NextResponse.json(await prisma.collection.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Os produtos da coleção somem junto; os pedidos ficam, só soltam o vínculo.
  await prisma.collection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
