import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { studySubjectCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, studySubjectCreateSchema);
  const last = await prisma.studySubject.findFirst({
    where: { areaId: data.areaId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return NextResponse.json(
    await prisma.studySubject.create({ data: { ...data, order: (last?.order ?? -1) + 1 } }),
  );
});
