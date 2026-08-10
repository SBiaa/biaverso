import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { mealLogCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const { dayId, mealType, eaten } = await parseBody(request, mealLogCreateSchema);

  // Upsert em vez de create: dois cliques rapidos na mesma refeicao nao podem
  // gerar dois logs para o mesmo dia (protegido por @@unique([dayId, mealType])).
  const log = await prisma.mealLog.upsert({
    where: { dayId_mealType: { dayId, mealType } },
    create: { dayId, mealType, eaten },
    update: { eaten },
  });

  return NextResponse.json(log);
});
