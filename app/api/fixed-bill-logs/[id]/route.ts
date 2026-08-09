import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unpaidStatus } from "@/lib/finance-calc";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { status, dueDate } = await request.json();

  const current = await prisma.fixedBillLog.findUniqueOrThrow({ where: { id } });

  const nextDueDate = dueDate ? new Date(dueDate) : current.dueDate;
  // Desmarcar como pago volta para PENDENTE ou ATRASADO conforme a data.
  const nextStatus =
    (status ?? current.status) === "PAGO" ? "PAGO" : unpaidStatus(nextDueDate);

  const log = await prisma.fixedBillLog.update({
    where: { id },
    data: {
      dueDate: nextDueDate,
      status: nextStatus,
      paidAt: nextStatus === "PAGO" ? (current.paidAt ?? new Date()) : null,
    },
  });

  return NextResponse.json(log);
}
