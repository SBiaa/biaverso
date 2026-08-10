import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { ideaCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, ideaCreateSchema);
  return NextResponse.json(
    await prisma.idea.create({ data: { ...data, businessId: data.businessId ?? null } }),
  );
});
