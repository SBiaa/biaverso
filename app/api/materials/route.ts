import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { materialCreateSchema } from "@/lib/schemas";

export const GET = route(async () => {
  const materials = await prisma.material.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { costItems: true } } },
  });

  return NextResponse.json(materials);
});

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, materialCreateSchema);
  const material = await prisma.material.create({ data });
  return NextResponse.json(material);
});
