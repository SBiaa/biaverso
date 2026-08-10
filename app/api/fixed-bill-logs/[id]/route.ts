import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { fixedBillLogPatchSchema } from "@/lib/schemas";
import { unpaidStatus } from "@/lib/finance-calc";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { status, dueDate } = await parseBody(request, fixedBillLogPatchSchema);

  const current = await prisma.fixedBillLog.findUniqueOrThrow({ where: { id } });

  const nextDueDate = dueDate ?? current.dueDate;
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
});
