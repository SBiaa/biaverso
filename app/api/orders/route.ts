import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery, route } from "@/lib/api";
import { orderCreateSchema, orderListQuerySchema } from "@/lib/schemas";
import { resolveOrderCompletedAt } from "@/lib/loja";

export const GET = route(async (request: Request) => {
  const q = parseQuery(request, orderListQuerySchema);

  const orders = await prisma.order.findMany({
    where: {
      businessId: q.businessId,
      collectionId: q.collectionId,
      status: q.status,
    },
    include: { collection: true },
    orderBy: [{ dueDate: "asc" }, { orderDate: "desc" }],
  });

  return NextResponse.json(orders);
});

export const POST = route(async (request: Request) => {
  const { completedAt, ...data } = await parseBody(request, orderCreateSchema);

  const order = await prisma.order.create({
    data: {
      ...data,
      dueDate: data.dueDate ?? null,
      collectionId: data.collectionId ?? null,
      completedAt: resolveOrderCompletedAt(data.status, completedAt, null),
    },
  });

  return NextResponse.json(order);
});
