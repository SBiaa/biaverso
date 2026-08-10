import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { transactionSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, transactionSchema);

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      ...data,
      payMethod: data.payMethod ?? null,
      businessId: data.businessId ?? null,
    },
  });

  return NextResponse.json(transaction);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
