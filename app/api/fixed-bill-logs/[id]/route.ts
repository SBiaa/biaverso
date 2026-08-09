import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { status } = await request.json();

  const log = await prisma.fixedBillLog.update({
    where: { id },
    data: { status, paidAt: status === "PAGO" ? new Date() : null },
  });

  return NextResponse.json(log);
}
