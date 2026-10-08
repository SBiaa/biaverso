import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { studyReorderSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const { parentId, ids } = await parseBody(request, studyReorderSchema);

  // O `courseId` no where impede que uma aula de outro curso entre na renumeração.
  await prisma.$transaction(
    ids.map((id, order) =>
      prisma.studyLesson.updateMany({ where: { id, courseId: parentId }, data: { order } }),
    ),
  );
  return NextResponse.json({ ok: true });
});
