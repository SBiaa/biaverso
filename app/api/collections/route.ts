import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery, route } from "@/lib/api";
import { collectionCreateSchema, collectionListQuerySchema } from "@/lib/schemas";

export const GET = route(async (request: Request) => {
  const q = parseQuery(request, collectionListQuerySchema);

  const collections = await prisma.collection.findMany({
    where: { businessId: q.businessId, status: q.status },
    include: { _count: { select: { products: true, orders: true } } },
    orderBy: [{ launchDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(collections);
});

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, collectionCreateSchema);

  const collection = await prisma.collection.create({
    data: { ...data, launchDate: data.launchDate ?? null },
  });

  return NextResponse.json(collection);
});
