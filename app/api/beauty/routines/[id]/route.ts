import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { careRoutinePatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, careRoutinePatchSchema);
  return NextResponse.json(await prisma.careRoutine.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Passos e registros diários somem junto (Cascade); os produtos ficam.
  await prisma.careRoutine.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
