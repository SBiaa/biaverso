import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { yearPlanSchema } from "@/lib/schemas";

type Params = { params: Promise<{ year: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const year = Number((await params).year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ApiError(400, "Ano inválido.");
  }
  const data = await parseBody(request, yearPlanSchema);
  const plan = await prisma.yearPlan.upsert({
    where: { year },
    create: { year, ...data },
    update: data,
  });
  return NextResponse.json(plan);
});
