import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { projectPricePatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string; priceId: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id, priceId } = await params;
  const data = await parseBody(request, projectPricePatchSchema);

  const item = await prisma.projectPriceItem.update({
    where: { id: priceId, projectId: id },
    data,
  });

  return NextResponse.json(item);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id, priceId } = await params;
  await prisma.projectPriceItem.delete({ where: { id: priceId, projectId: id } });
  return NextResponse.json({ ok: true });
});
