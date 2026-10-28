import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { projectLogCreateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const entries = await prisma.projectLogEntry.findMany({
    where: { projectId: id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(entries);
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, projectLogCreateSchema);

  const entry = await prisma.projectLogEntry.create({
    data: { ...data, projectId: id },
  });

  return NextResponse.json(entry);
});
