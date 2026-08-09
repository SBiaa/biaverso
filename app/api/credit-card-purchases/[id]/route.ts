import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Apaga a compra e todas as parcelas dela, em todas as faturas.
  await prisma.$transaction([
    prisma.creditCardEntry.deleteMany({ where: { purchaseId: id } }),
    prisma.creditCardPurchase.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
