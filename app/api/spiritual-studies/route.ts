import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { spiritualStudyCreateSchema } from "@/lib/schemas";
import { todayUtc } from "@/lib/utils";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, spiritualStudyCreateSchema);

  const study = await prisma.spiritualStudy.create({
    data: {
      ...data,
      // Já cadastrado como entregue (um exercício antigo sendo registrado
      // depois): a data de entrega é hoje, senão o registro nasce incoerente.
      deliveredAt: data.status === "ENTREGUE" ? todayUtc() : null,
    },
  });

  return NextResponse.json(study);
});
