import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { reorderSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { ids } = await parseBody(request, reorderSchema);

  // Tudo numa transação: um erro no meio deixaria metade da lista com a ordem
  // nova e metade com a antiga. O `collectionId` no where impede que um id de
  // outra coleção entre na renumeração.
  await prisma.$transaction(
    ids.map((taskId, order) =>
      prisma.collectionTask.updateMany({
        where: { id: taskId, collectionId: id },
        data: { order },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
});
