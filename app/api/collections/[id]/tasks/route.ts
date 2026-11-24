import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { collectionTaskCreateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const tasks = await prisma.collectionTask.findMany({
    where: { collectionId: id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(tasks);
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, collectionTaskCreateSchema);

  const order = await prisma.collectionTask.count({ where: { collectionId: id } });

  const task = await prisma.collectionTask.create({
    data: {
      ...data,
      dueDate: data.dueDate ?? null,
      collectionId: id,
      order,
    },
  });

  return NextResponse.json(task);
});
