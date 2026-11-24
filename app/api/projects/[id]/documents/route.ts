import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { projectDocumentCreateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const documents = await prisma.projectDocument.findMany({
    where: { projectId: id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(documents);
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, projectDocumentCreateSchema);

  // Entra no fim da lista: a contagem atual vira a ordem do novo item.
  const order = await prisma.projectDocument.count({ where: { projectId: id } });

  const document = await prisma.projectDocument.create({
    data: { ...data, projectId: id, order },
  });

  return NextResponse.json(document);
});
