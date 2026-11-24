import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { activityCategoryCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, activityCategoryCreateSchema);
  return NextResponse.json(await prisma.activityCategory.create({ data }));
});
