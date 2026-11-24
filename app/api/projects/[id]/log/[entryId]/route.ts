import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { projectLogPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string; entryId: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id, entryId } = await params;
  const data = await parseBody(request, projectLogPatchSchema);

  // `projectId` no where: id de entrada de outro projeto dá 404.
  const entry = await prisma.projectLogEntry.update({
    where: { id: entryId, projectId: id },
    data,
  });

  return NextResponse.json(entry);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id, entryId } = await params;
  await prisma.projectLogEntry.delete({ where: { id: entryId, projectId: id } });
  return NextResponse.json({ ok: true });
});
