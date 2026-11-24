import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { brainstormCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const { year, texts, pillarId, carriedFromId } = await parseBody(request, brainstormCreateSchema);

  if (carriedFromId) {
    const source = await prisma.brainstormItem.findUniqueOrThrow({
      where: { id: carriedFromId },
      include: { carriedTo: { select: { id: true } } },
    });
    if (source.carriedTo) throw new ApiError(409, "Esse item já foi trazido.");
    const item = await prisma.brainstormItem.create({
      data: { year, text: source.text, pillarId: source.pillarId, carriedFromId },
    });
    return NextResponse.json([item]);
  }

  // Um item por linha não vazia, na ordem em que foi escrito.
  const lines = (texts ?? []).filter(Boolean);
  const items = await prisma.$transaction(
    lines.map((text) => prisma.brainstormItem.create({ data: { year, text, pillarId } })),
  );
  return NextResponse.json(items);
});
