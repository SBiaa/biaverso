import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { mealLogPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { eaten } = await parseBody(request, mealLogPatchSchema);
  return NextResponse.json(await prisma.mealLog.update({ where: { id }, data: { eaten } }));
});
