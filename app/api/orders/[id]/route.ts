import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { orderPatchSchema } from "@/lib/schemas";
import { resolveOrderCompletedAt } from "@/lib/loja";
import { replaceOrderItems } from "@/lib/orders";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { completedAt, status, items, ...patch } = await parseBody(
    request,
    orderPatchSchema,
  );

  const existing = await prisma.order.findUniqueOrThrow({ where: { id } });

  const data = {
    ...patch,
    status,
    completedAt:
      status !== undefined
        ? resolveOrderCompletedAt(status, completedAt, existing.completedAt)
        : completedAt,
  };

  // Sem `items` no corpo, os itens e os totais ficam como estão: é o caminho de
  // quem só mudou o status do pedido.
  const order = items
    ? await replaceOrderItems(id, items, data)
    : await prisma.order.update({ where: { id }, data });

  return NextResponse.json(order);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
