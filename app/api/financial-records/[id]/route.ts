import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { payment } = await request.json();

  const current = await prisma.financialRecord.findUniqueOrThrow({
    where: { id },
  });

  const paidAmount = Math.min(
    current.totalAmount,
    current.paidAmount + payment,
  );
  const status =
    paidAmount >= current.totalAmount
      ? "QUITADO"
      : paidAmount > 0
        ? "PARCIAL"
        : "EM_ABERTO";

  const record = await prisma.financialRecord.update({
    where: { id },
    data: { paidAmount, status },
  });

  return NextResponse.json(record);
}
