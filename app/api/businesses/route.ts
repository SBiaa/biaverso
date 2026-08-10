import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { businessCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, businessCreateSchema);
  return NextResponse.json(await prisma.business.create({ data }));
});
