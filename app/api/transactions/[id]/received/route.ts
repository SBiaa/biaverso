import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { transactionReceivedSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

/** Marca que a entrada caiu na conta — é o que faz ela entrar no saldo do mês. */
export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { received } = await parseBody(request, transactionReceivedSchema);

  const transaction = await prisma.transaction.update({
    where: { id },
    data: { received },
  });

  return NextResponse.json(transaction);
});
