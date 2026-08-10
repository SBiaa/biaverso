import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { creditCardEntryPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, creditCardEntryPatchSchema);

  const entry = await prisma.$transaction(async (tx) => {
    const updated = await tx.creditCardEntry.update({
      where: { id },
      data: { ...data, businessId: data.businessId ?? null },
    });

    // Se a parcela pertence a uma compra parcelada, o total da compra tem que
    // acompanhar — senao a soma das parcelas para de bater com o total.
    if (updated.purchaseId) {
      const sum = await tx.creditCardEntry.aggregate({
        _sum: { amount: true },
        where: { purchaseId: updated.purchaseId },
      });
      await tx.creditCardPurchase.update({
        where: { id: updated.purchaseId },
        data: { totalAmount: sum._sum.amount ?? 0 },
      });
    }

    return updated;
  });

  return NextResponse.json(entry);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.creditCardEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
