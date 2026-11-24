import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { studyAreaCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, studyAreaCreateSchema);
  const last = await prisma.studyArea.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return NextResponse.json(
    await prisma.studyArea.create({ data: { ...data, order: (last?.order ?? -1) + 1 } }),
  );
});
