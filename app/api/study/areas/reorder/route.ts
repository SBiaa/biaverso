import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { reorderSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const { ids } = await parseBody(request, reorderSchema);

  // Numa transação: um erro no meio deixaria metade da lista na ordem nova.
  await prisma.$transaction(
    ids.map((id, order) => prisma.studyArea.updateMany({ where: { id }, data: { order } })),
  );
  return NextResponse.json({ ok: true });
});
