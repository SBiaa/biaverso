import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { priorityLevelCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, priorityLevelCreateSchema);

  // Nível novo entra no fim da fila: menos urgente que os que já existem.
  const last = await prisma.priorityLevel.aggregate({ _max: { order: true } });

  return NextResponse.json(
    await prisma.priorityLevel.create({
      data: { ...data, order: (last._max.order ?? -1) + 1 },
    }),
  );
});
