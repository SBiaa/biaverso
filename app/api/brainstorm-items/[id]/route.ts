import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { brainstormPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { organized, ...data } = await parseBody(request, brainstormPatchSchema);
  return NextResponse.json(
    await prisma.brainstormItem.update({
      where: { id },
      data: {
        ...data,
        ...(organized !== undefined && { organizedAt: organized ? new Date() : null }),
      },
    }),
  );
});

// Apaga só o item: a meta ou o desejo que ele virou continuam existindo.
export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.brainstormItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
