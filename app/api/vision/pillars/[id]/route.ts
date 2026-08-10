import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { pillarPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, pillarPatchSchema);
  return NextResponse.json(await prisma.pillar.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Moodboard, objetivos conceituais e metrificados somem junto (Cascade);
  // desejos e principios soltam o vinculo com o pilar (SetNull).
  await prisma.pillar.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
