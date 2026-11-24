import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { businessCredentialCreateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  // A senha em si nunca sai por aqui: a listagem mostra nome, login e url. Quem
  // precisa do valor pede pela rota do cofre, já protegida pelo middleware.
  const credentials = await prisma.businessCredential.findMany({
    where: { businessId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      passwordEntryId: true,
      passwordEntry: {
        select: { id: true, name: true, login: true, url: true, category: true },
      },
    },
  });

  return NextResponse.json(credentials);
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { passwordEntryId } = await parseBody(request, businessCredentialCreateSchema);

  const credential = await prisma.businessCredential.create({
    data: { businessId: id, passwordEntryId },
  });

  return NextResponse.json(credential);
});
