import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const {
    description,
    amount,
    purchaseDate,
    invoiceMonth,
    invoiceYear,
    installment,
    category,
    businessId,
    notes,
  } = await request.json();

  const entry = await prisma.creditCardEntry.update({
    where: { id },
    data: {
      description,
      amount,
      purchaseDate: new Date(purchaseDate),
      invoiceMonth,
      invoiceYear,
      installment: installment || null,
      category,
      businessId: businessId || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(entry);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.creditCardEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
