import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { financialRecordCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, financialRecordCreateSchema);

  const record = await prisma.financialRecord.create({
    data: {
      ...data,
      installments: data.installments ?? null,
      dueDay: data.dueDay ?? null,
      status: "EM_ABERTO",
    },
  });

  return NextResponse.json(record);
});
