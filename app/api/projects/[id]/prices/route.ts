import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { projectPriceCreateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const items = await prisma.projectPriceItem.findMany({
    where: { projectId: id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(items);
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, projectPriceCreateSchema);

  const order = await prisma.projectPriceItem.count({ where: { projectId: id } });

  const item = await prisma.projectPriceItem.create({
    data: { ...data, projectId: id, order },
  });

  return NextResponse.json(item);
});
