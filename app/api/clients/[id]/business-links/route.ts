import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { businessLinkSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { businessId } = await parseBody(request, businessLinkSchema);

  // Vinculo repetido bate na unique e o wrapper devolve 409.
  const link = await prisma.clientBusiness.create({ data: { clientId: id, businessId } });
  return NextResponse.json(link);
});
