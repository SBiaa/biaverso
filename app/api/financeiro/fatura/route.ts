import { NextResponse } from "next/server";
import { ApiError, parseBody, parseQuery, route } from "@/lib/api";
import { invoiceMonthQuerySchema, invoicePaymentSchema } from "@/lib/schemas";
import { getInvoice, payInvoice, reopenInvoice } from "@/lib/finance";
import { todayUtc } from "@/lib/utils";

/** Fatura unificada do mês: compras avulsas/parcelas + assinaturas no cartão. */
export const GET = route(async (request: Request) => {
  const { month, year } = parseQuery(request, invoiceMonthQuerySchema);
  return NextResponse.json(await getInvoice(month, year));
});

/** Marca a fatura do mês como paga, ou reabre. */
export const PATCH = route(async (request: Request) => {
  const { month, year, status, paidAt, paidAmount, createTransaction } =
    await parseBody(request, invoicePaymentSchema);

  if (status === "ABERTA") {
    await reopenInvoice(month, year);
    return NextResponse.json(await getInvoice(month, year));
  }

  // Sem valor informado, paga o total da fatura naquele momento.
  const invoice = await getInvoice(month, year);
  const amount = paidAmount ?? invoice.total;
  if (amount <= 0) {
    throw new ApiError(400, "Fatura sem valor para pagar.");
  }

  await payInvoice(month, year, {
    paidAmount: amount,
    paidAt: paidAt ?? todayUtc(),
    createTransaction,
  });

  return NextResponse.json(await getInvoice(month, year));
});
