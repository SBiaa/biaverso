import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { collectionProductPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string; productId: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id, productId } = await params;
  const data = await parseBody(request, collectionProductPatchSchema);

  // `id` entra no where para que um productId de outra coleção dê 404 em vez de
  // editar o produto errado por causa de um link montado à mão.
  const product = await prisma.collectionProduct.update({
    where: { id: productId, collectionId: id },
    data,
  });

  return NextResponse.json(product);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id, productId } = await params;
  await prisma.collectionProduct.delete({ where: { id: productId, collectionId: id } });
  return NextResponse.json({ ok: true });
});
