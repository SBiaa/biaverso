import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, route } from "@/lib/api";
import { costItemsQuery } from "@/lib/produtos";

type Params = { params: Promise<{ id: string }> };

/**
 * Copia um produto com todos os itens de custo. É o caminho normal para criar
 * "Caneca 500ml" a partir da de 325ml: quase toda a composição de custo se
 * repete e só um ou dois valores mudam.
 */
export const POST = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const source = await prisma.product.findUnique({
    where: { id },
    include: { costItems: costItemsQuery },
  });
  if (!source) throw new ApiError(404, "Produto não encontrado.");

  const copy = await prisma.product.create({
    data: {
      name: `${source.name} (cópia)`,
      description: source.description,
      category: source.category,
      imageUrl: source.imageUrl,
      basePrice: source.basePrice,
      targetMargin: source.targetMargin,
      notes: source.notes,
      businessId: source.businessId,
      costItems: {
        create: source.costItems.map((item) => ({
          label: item.label,
          kind: item.kind,
          mode: item.mode,
          amount: item.amount,
          order: item.order,
          materialId: item.materialId,
        })),
      },
    },
  });

  return NextResponse.json(copy);
});
