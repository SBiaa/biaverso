import { NextResponse } from "next/server";
import { parseQuery, route } from "@/lib/api";
import { invoiceMonthQuerySchema } from "@/lib/schemas";
import { getMonthPlan } from "@/lib/finance";

/** Previsão do mês: entradas, saídas e saldo projetado. */
export const GET = route(async (request: Request) => {
  const { month, year } = parseQuery(request, invoiceMonthQuerySchema);
  return NextResponse.json(await getMonthPlan(month, year));
});
