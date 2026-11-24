import { NextResponse } from "next/server";
import { parseBody, route } from "@/lib/api";
import { installmentPurchaseSchema } from "@/lib/schemas";
import { createInstallmentPurchase } from "@/lib/finance";
import { todayUtc } from "@/lib/utils";

/** Cria a compra parcelada e já espalha uma parcela por fatura. */
export const POST = route(async (request: Request) => {
  const data = await parseBody(request, installmentPurchaseSchema);

  const purchase = await createInstallmentPurchase({
    ...data,
    purchaseDate: data.purchaseDate ?? todayUtc(),
  });

  return NextResponse.json(purchase);
});
