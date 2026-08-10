import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { habitLogPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { done } = await parseBody(request, habitLogPatchSchema);
  return NextResponse.json(await prisma.habitLog.update({ where: { id }, data: { done } }));
});
