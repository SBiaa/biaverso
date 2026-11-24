import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { studySubjectPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const patch = await parseBody(request, studySubjectPatchSchema);
  return NextResponse.json(await prisma.studySubject.update({ where: { id }, data: patch }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.studySubject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
