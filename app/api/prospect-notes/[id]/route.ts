import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.prospectNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
