import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addInvoiceMonths, splitInstallments } from "@/lib/finance-calc";

export async function POST(request: Request) {
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
  } = await request.json();

  const count = Math.max(1, Number(installments) || 1);
  const date = new Date(purchaseDate);

  // Compra à vista: só um lançamento, sem registro de compra parcelada.
  if (count === 1) {
    const entry = await prisma.creditCardEntry.create({
      data: {
        description,
        amount,
        purchaseDate: date,
        invoiceMonth,
        invoiceYear,
        category,
        businessId: businessId || null,
        notes: notes || null,
      },
    });
    return NextResponse.json(entry);
  }

  // Parcelada: uma parcela por fatura, a partir da fatura escolhida.
  const amounts = splitInstallments(amount, count);

  const purchase = await prisma.creditCardPurchase.create({
    data: {
      description,
      totalAmount: amount,
      installments: count,
      purchaseDate: date,
      category,
      businessId: businessId || null,
      notes: notes || null,
      entries: {
        create: amounts.map((value, index) => {
          const invoice = addInvoiceMonths(invoiceMonth, invoiceYear, index);
          return {
            description,
            amount: value,
            purchaseDate: date,
            invoiceMonth: invoice.month,
            invoiceYear: invoice.year,
            installment: `${index + 1}/${count}`,
            category,
            businessId: businessId || null,
            notes: notes || null,
          };
        }),
      },
    },
    include: { entries: true },
  });

  return NextResponse.json(purchase);
}
