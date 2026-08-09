import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name, amount, dueDay, type, notes } = await request.json();

  const bill = await prisma.fixedBill.update({
    where: { id },
    data: {
      name,
      amount,
      dueDay,
      type,
      notes: notes || null,
    },
  });

  return NextResponse.json(bill);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await prisma.$transaction([
    prisma.fixedBillLog.deleteMany({ where: { fixedBillId: id } }),
    prisma.fixedBill.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
