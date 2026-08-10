import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { collectionProductCreateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const products = await prisma.collectionProduct.findMany({
    where: { collectionId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(products);
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, collectionProductCreateSchema);

  const product = await prisma.collectionProduct.create({
    data: {
      ...data,
      collectionId: id,
      price: data.price ?? null,
      cost: data.cost ?? null,
    },
  });

  return NextResponse.json(product);
});
