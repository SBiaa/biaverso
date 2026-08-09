import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function resolveStatus(paidAmount: number, totalAmount: number) {
  if (paidAmount >= totalAmount) return "QUITADO" as const;
  return paidAmount > 0 ? ("PARCIAL" as const) : ("EM_ABERTO" as const);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const current = await prisma.financialRecord.findUniqueOrThrow({
    where: { id },
  });

  if (body.payment !== undefined) {
    const paidAmount = Math.min(
      current.totalAmount,
      current.paidAmount + body.payment,
    );

    const record = await prisma.financialRecord.update({
      where: { id },
      data: { paidAmount, status: resolveStatus(paidAmount, current.totalAmount) },
    });

    return NextResponse.json(record);
  }

  const { name, totalAmount, paidAmount, installments, dueDay, notes } = body;
  const nextTotal = totalAmount ?? current.totalAmount;
  const nextPaid = Math.min(
    nextTotal,
    paidAmount ?? current.paidAmount,
  );

  const record = await prisma.financialRecord.update({
    where: { id },
    data: {
      name: name ?? current.name,
      totalAmount: nextTotal,
      paidAmount: nextPaid,
      installments: installments ?? null,
      dueDay: dueDay ?? null,
      notes: notes || null,
      status: resolveStatus(nextPaid, nextTotal),
    },
  });

  return NextResponse.json(record);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await prisma.financialRecord.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
