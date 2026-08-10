import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { clientBusinessPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { status } = await parseBody(request, clientBusinessPatchSchema);
  return NextResponse.json(await prisma.clientBusiness.update({ where: { id }, data: { status } }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.clientBusiness.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
