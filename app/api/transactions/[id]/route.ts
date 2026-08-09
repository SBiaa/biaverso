import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name, type, amount, date, businessId, category, payMethod, notes } =
    await request.json();

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      name,
      type,
      amount,
      date: new Date(date),
      businessId: businessId || null,
      category,
      payMethod: payMethod || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(transaction);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
