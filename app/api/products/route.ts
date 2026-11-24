import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery, route } from "@/lib/api";
import { productCreateSchema, productListQuerySchema } from "@/lib/schemas";
import { costItemsQuery } from "@/lib/produtos";

export const GET = route(async (request: Request) => {
  const { businessId, category, active } = parseQuery(request, productListQuerySchema);

  const products = await prisma.product.findMany({
    where: {
      // Um produto sem negócio serve para todos, então ele entra em qualquer
      // filtro de negócio — é o caso da caneca, vendida pelas três marcas.
      ...(businessId ? { OR: [{ businessId }, { businessId: null }] } : {}),
      ...(category ? { category } : {}),
      ...(active ? { active: active === "true" } : {}),
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { costItems: costItemsQuery },
  });

  return NextResponse.json(products);
});

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, productCreateSchema);
  const product = await prisma.product.create({ data });
  return NextResponse.json(product);
});
