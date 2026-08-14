import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { productCostItemPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string; itemId: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id, itemId } = await params;
  const data = await parseBody(request, productCostItemPatchSchema);

  // `id` no where para que um itemId de outro produto dê 404 em vez de editar
  // o custo errado por causa de um link montado à mão.
  const item = await prisma.productCostItem.update({
    where: { id: itemId, productId: id },
    data,
  });

  return NextResponse.json(item);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id, itemId } = await params;
  await prisma.productCostItem.delete({ where: { id: itemId, productId: id } });
  return NextResponse.json({ ok: true });
});
