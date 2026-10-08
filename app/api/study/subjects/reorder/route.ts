import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { studyReorderSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const { parentId, ids } = await parseBody(request, studyReorderSchema);

  // O `areaId` no where impede que um assunto de outra área entre na renumeração.
  await prisma.$transaction(
    ids.map((id, order) =>
      prisma.studySubject.updateMany({ where: { id, areaId: parentId }, data: { order } }),
    ),
  );
  return NextResponse.json({ ok: true });
});
