import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { clientCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const { businessId, ...data } = await parseBody(request, clientCreateSchema);

  const client = await prisma.client.create({
    data: { ...data, businessLinks: { create: { businessId } } },
    include: { businessLinks: true },
  });

  return NextResponse.json(client);
});
