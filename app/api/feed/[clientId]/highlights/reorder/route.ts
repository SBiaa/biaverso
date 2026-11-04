import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { reorderSchema } from "@/lib/schemas";

type Params = { params: Promise<{ clientId: string }> };

export const POST = route(async (request: Request, { params }: Params) => {
  const { clientId } = await params;
  const { ids } = await parseBody(request, reorderSchema);

  // Numa transação: um erro no meio deixaria metade da lista na ordem nova.
  await prisma.$transaction(
    ids.map((id, order) =>
      prisma.instagramHighlight.updateMany({ where: { id, clientId }, data: { order } }),
    ),
  );
  return NextResponse.json({ ok: true });
});
