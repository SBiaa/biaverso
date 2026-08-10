import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { pillarCreateSchema } from "@/lib/schemas";

export const GET = route(async () => {
  const pillars = await prisma.pillar.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
  return NextResponse.json(pillars);
});

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, pillarCreateSchema);
  return NextResponse.json(await prisma.pillar.create({ data }));
});
