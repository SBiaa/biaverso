import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { projectDocumentPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string; documentId: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id, documentId } = await params;
  const data = await parseBody(request, projectDocumentPatchSchema);

  // `projectId` no where para que um id de outro projeto dê 404 em vez de
  // editar o documento errado.
  const document = await prisma.projectDocument.update({
    where: { id: documentId, projectId: id },
    data,
  });

  return NextResponse.json(document);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id, documentId } = await params;
  await prisma.projectDocument.delete({ where: { id: documentId, projectId: id } });
  return NextResponse.json({ ok: true });
});
