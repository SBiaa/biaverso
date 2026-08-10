import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { moodboardCreateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const items = await prisma.moodboardItem.findMany({
    where: { pillarId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(items);
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, moodboardCreateSchema);

  const count = await prisma.moodboardItem.count({ where: { pillarId: id } });

  const item = await prisma.moodboardItem.create({
    data: { ...data, order: count, pillarId: id },
  });

  return NextResponse.json(item);
});
