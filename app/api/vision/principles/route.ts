import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery, route } from "@/lib/api";
import { pillarIdQuerySchema, principleSchema } from "@/lib/schemas";

export const GET = route(async (request: Request) => {
  const { pillarId } = parseQuery(request, pillarIdQuerySchema);
  const principles = await prisma.principle.findMany({
    where: pillarId ? { pillarId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(principles);
});

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, principleSchema);
  return NextResponse.json(
    await prisma.principle.create({ data: { ...data, pillarId: data.pillarId ?? null } }),
  );
});
