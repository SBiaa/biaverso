import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { materialPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, materialPatchSchema);

  // Nada de fan-out ao mudar o preço: o custo dos produtos é lido do insumo na
  // hora, então reajustar aqui já vale para todos. Os pedidos fechados não se
  // mexem — o custo deles ficou congelado no OrderItem.
  const material = await prisma.material.update({ where: { id }, data });
  return NextResponse.json(material);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const inUse = await prisma.productCostItem.count({ where: { materialId: id } });
  if (inUse > 0) {
    const products = await prisma.productCostItem.findMany({
      where: { materialId: id },
      select: { product: { select: { name: true } } },
      distinct: ["productId"],
      take: 5,
    });
    const names = products.map((p) => p.product.name).join(", ");

    throw new ApiError(
      409,
      `Este insumo está na composição de custo de ${inUse} ${
        inUse === 1 ? "produto" : "produtos"
      } (${names}). Tire a linha de custo de lá antes de excluir.`,
    );
  }

  await prisma.material.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
