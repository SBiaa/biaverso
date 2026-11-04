import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { instagramHighlightCreateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ clientId: string }> };

/** Destaque novo entra no fim da fila, como no app. */
export const POST = route(async (request: Request, { params }: Params) => {
  const { clientId } = await params;
  const data = await parseBody(request, instagramHighlightCreateSchema);
  const last = await prisma.instagramHighlight.findFirst({
    where: { clientId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const highlight = await prisma.instagramHighlight.create({
    data: { clientId, ...data, order: (last?.order ?? -1) + 1 },
  });
  return NextResponse.json(highlight);
});
