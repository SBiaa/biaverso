import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { transactionSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, transactionSchema);

  const transaction = await prisma.transaction.create({
    data: {
      ...data,
      payMethod: data.payMethod ?? null,
      businessId: data.businessId ?? null,
    },
  });

  return NextResponse.json(transaction);
});
