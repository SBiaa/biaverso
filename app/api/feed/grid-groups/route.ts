import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { gridGroupSchema } from "@/lib/schemas";

/**
 * Marca posts como um conjunto do grid (o trio que forma uma imagem). Um post
 * só cabe num conjunto: entrar num novo tira ele do anterior.
 */
export const POST = route(async (request: Request) => {
  const { ids } = await parseBody(request, gridGroupSchema);
  const gridGroupId = randomUUID();
  const { count } = await prisma.contentPost.updateMany({
    where: { id: { in: ids } },
    data: { gridGroupId },
  });
  if (count !== ids.length) throw new ApiError(404, "Algum desses posts não existe mais.");
  return NextResponse.json({ gridGroupId });
});
