import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { creditCardEntryCreateSchema } from "@/lib/schemas";
import { createInstallmentPurchase } from "@/lib/finance";

export const POST = route(async (request: Request) => {
  const {
    description,
    amount,
    purchaseDate,
    invoiceMonth,
    invoiceYear,
    installments,
    category,
    businessId,
    notes,
  } = await parseBody(request, creditCardEntryCreateSchema);

  // Compra a vista: so um lancamento, sem registro de compra parcelada.
  if (installments === 1) {
    const entry = await prisma.creditCardEntry.create({
      data: {
        description,
        purchaseDate,
        category,
        businessId: businessId ?? null,
        notes,
        amount,
        invoiceMonth,
        invoiceYear,
      },
    });
    return NextResponse.json(entry);
  }

  const purchase = await createInstallmentPurchase({
    description,
    totalAmount: amount,
    installments,
    firstInvoiceMonth: invoiceMonth,
    firstInvoiceYear: invoiceYear,
    purchaseDate,
    category,
    businessId,
    notes,
  });

  return NextResponse.json(purchase);
});
