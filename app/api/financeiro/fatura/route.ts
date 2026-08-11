import { NextResponse } from "next/server";
import { parseQuery, route } from "@/lib/api";
import { invoiceMonthQuerySchema } from "@/lib/schemas";
import { getInvoice } from "@/lib/finance";

/** Fatura unificada do mês: compras avulsas/parcelas + assinaturas no cartão. */
export const GET = route(async (request: Request) => {
  const { month, year } = parseQuery(request, invoiceMonthQuerySchema);
  return NextResponse.json(await getInvoice(month, year));
});
