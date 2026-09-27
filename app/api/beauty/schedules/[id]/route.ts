import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { careSchedulePatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, careSchedulePatchSchema);
  return NextResponse.json(await prisma.careSchedule.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Passos e histórico do ciclo somem junto (Cascade); os produtos ficam.
  await prisma.careSchedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
