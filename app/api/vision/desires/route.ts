import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery, route } from "@/lib/api";
import { desireSchema, pillarIdQuerySchema } from "@/lib/schemas";

export const GET = route(async (request: Request) => {
  const { pillarId } = parseQuery(request, pillarIdQuerySchema);
  const desires = await prisma.desire.findMany({
    where: pillarId ? { pillarId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(desires);
});

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, desireSchema);
  return NextResponse.json(
    await prisma.desire.create({ data: { ...data, pillarId: data.pillarId ?? null } }),
  );
});
