import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery, route } from "@/lib/api";
import { computeExpiresAt, createBeautyTransaction, getProducts } from "@/lib/beleza";
import { beautyProductCreateSchema, beautyProductQuerySchema } from "@/lib/schemas";
import { todayUtc } from "@/lib/utils";

export const GET = route(async (request: Request) => {
  const { category, status } = parseQuery(request, beautyProductQuerySchema);
  return NextResponse.json(await getProducts({ category, status }));
});

export const POST = route(async (request: Request) => {
  const { createTransaction, ...data } = await parseBody(request, beautyProductCreateSchema);

  const product = await prisma.beautyProduct.create({
    data: {
      ...data,
      // Abriu e sabe o PAO ("12M") = validade derivada; senão vale a data digitada.
      expiresAt: computeExpiresAt(data.openedAt, data.pao, data.expiresAt),
    },
  });

  const transaction =
    createTransaction && data.cost
      ? await createBeautyTransaction({
          name: product.name,
          amount: data.cost,
          date: todayUtc(),
          notes: product.brand,
        })
      : null;

  return NextResponse.json({ ...product, transaction });
});
