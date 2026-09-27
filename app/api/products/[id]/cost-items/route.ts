import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { productCostItemCreateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, productCostItemCreateSchema);

  // Entra no fim da lista de custos, na ordem em que você foi montando a conta.
  const last = await prisma.productCostItem.findFirst({
    where: { productId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const item = await prisma.productCostItem.create({
    data: { ...data, productId: id, order: (last?.order ?? -1) + 1 },
  });

  return NextResponse.json(item);
});
