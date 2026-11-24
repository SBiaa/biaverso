import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { altarItemCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, altarItemCreateSchema);
  return NextResponse.json(await prisma.altarItem.create({ data }));
});
