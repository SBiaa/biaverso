import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { collectionProductCreateSchema } from "@/lib/schemas";
import { costItemsQuery } from "@/lib/produtos";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const products = await prisma.collectionProduct.findMany({
    where: { collectionId: id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { product: { include: { costItems: costItemsQuery } } },
  });

  return NextResponse.json(products);
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, collectionProductCreateSchema);

  const last = await prisma.collectionProduct.findFirst({
    where: { collectionId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const product = await prisma.collectionProduct.create({
    data: {
      ...data,
      collectionId: id,
      // Preço em branco = "usa o da base", não zero: com zero a peça apareceria
      // como prejuízo de 100% na margem da coleção.
      price: data.price ?? null,
      extraCost: data.extraCost ?? null,
      order: (last?.order ?? -1) + 1,
    },
  });

  return NextResponse.json(product);
});
