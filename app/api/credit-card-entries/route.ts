import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { creditCardEntryCreateSchema } from "@/lib/schemas";
import { addInvoiceMonths, splitInstallments } from "@/lib/finance-calc";

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

  const shared = { description, purchaseDate, category, businessId: businessId ?? null, notes };

  // Compra a vista: so um lancamento, sem registro de compra parcelada.
  if (installments === 1) {
    const entry = await prisma.creditCardEntry.create({
      data: { ...shared, amount, invoiceMonth, invoiceYear },
    });
    return NextResponse.json(entry);
  }

  // Parcelada: uma parcela por fatura, a partir da fatura escolhida.
  const amounts = splitInstallments(amount, installments);

  const purchase = await prisma.creditCardPurchase.create({
    data: {
      ...shared,
      totalAmount: amount,
      installments,
      entries: {
        create: amounts.map((value, index) => {
          const invoice = addInvoiceMonths(invoiceMonth, invoiceYear, index);
          return {
            ...shared,
            amount: value,
            invoiceMonth: invoice.month,
            invoiceYear: invoice.year,
            installment: `${index + 1}/${installments}`,
          };
        }),
      },
    },
    include: { entries: true },
  });

  return NextResponse.json(purchase);
});
