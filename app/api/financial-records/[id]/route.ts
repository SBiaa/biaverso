import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import {
  financialRecordPatchSchema,
  financialRecordPaymentSchema,
} from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

function resolveStatus(paidAmount: number, totalAmount: number) {
  if (paidAmount >= totalAmount) return "QUITADO" as const;
  return paidAmount > 0 ? ("PARCIAL" as const) : ("EM_ABERTO" as const);
}

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const body = await request.json();

  const current = await prisma.financialRecord.findUniqueOrThrow({ where: { id } });

  // Abatimento: soma ao que já foi pago, sem passar do total.
  if (body?.payment !== undefined) {
    const { payment } = financialRecordPaymentSchema.parse(body);
    const paidAmount = Math.min(current.totalAmount, current.paidAmount + payment);

    return NextResponse.json(
      await prisma.financialRecord.update({
        where: { id },
        data: { paidAmount, status: resolveStatus(paidAmount, current.totalAmount) },
      }),
    );
  }

  const patch = financialRecordPatchSchema.parse(body);

  const nextTotal = patch.totalAmount ?? current.totalAmount;
  const nextPaid = Math.min(nextTotal, patch.paidAmount ?? current.paidAmount);

  // Campo ausente chega como `undefined` e o Prisma ignora; só um `null`
  // explícito limpa. Antes era `?? null`, então editar apenas o nome zerava
  // parcelas, dia de vencimento e notas que a tela nem tinha enviado.
  const record = await prisma.financialRecord.update({
    where: { id },
    data: {
      name: patch.name,
      totalAmount: nextTotal,
      paidAmount: nextPaid,
      installments: patch.installments,
      dueDay: patch.dueDay,
      notes: patch.notes,
      status: resolveStatus(nextPaid, nextTotal),
    },
  });

  return NextResponse.json(record);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.financialRecord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
