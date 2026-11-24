import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { productPatchSchema } from "@/lib/schemas";
import { costItemsQuery } from "@/lib/produtos";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { costItems: costItemsQuery },
  });
  if (!product) throw new ApiError(404, "Produto não encontrado.");

  return NextResponse.json(product);
});

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, productPatchSchema);

  const product = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(product);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  // A checagem existe pela mensagem: o banco barraria igual (onDelete Restrict),
  // mas com um erro genérico. Aqui ela diz em quantas peças o produto está, que
  // é a informação necessária para decidir o que fazer.
  const inUse = await prisma.collectionProduct.count({ where: { productId: id } });
  if (inUse > 0) {
    throw new ApiError(
      409,
      `Este produto é a base de ${inUse} ${inUse === 1 ? "peça" : "peças"} em coleções. ` +
        "Remova as peças de lá antes de excluir, ou desative o produto para " +
        "tirá-lo da lista sem perder o histórico.",
    );
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
