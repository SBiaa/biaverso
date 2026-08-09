import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { FinancialRecordsSection } from "@/components/modules/financeiro/FinancialRecordsSection";
import { CardInstallmentsList } from "@/components/modules/financeiro/CardInstallmentsList";
import { compareInvoiceMonths } from "@/lib/finance-calc";
import { formatCurrencyBRL, formatMonthYearBR, startOfToday } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DividasPage() {
  const today = startOfToday();
  const currentInvoice = {
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  };

  const [records, purchases] = await Promise.all([
    prisma.financialRecord.findMany({
      where: { type: "DIVIDA" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.creditCardPurchase.findMany({
      orderBy: { purchaseDate: "desc" },
      include: { entries: true },
    }),
  ]);

  // Parcela de fatura já passada conta como paga; a do mês atual ainda está em aberto.
  const installmentItems = purchases
    .map((purchase) => {
      const remaining = purchase.entries
        .filter(
          (entry) =>
            compareInvoiceMonths(
              { month: entry.invoiceMonth, year: entry.invoiceYear },
              currentInvoice,
            ) >= 0,
        )
        .sort((a, b) =>
          compareInvoiceMonths(
            { month: a.invoiceMonth, year: a.invoiceYear },
            { month: b.invoiceMonth, year: b.invoiceYear },
          ),
        );

      const remainingAmount = remaining.reduce((sum, e) => sum + e.amount, 0);
      const next = remaining[0];

      return {
        id: purchase.id,
        description: purchase.description,
        totalAmount: purchase.totalAmount,
        paidAmount: purchase.totalAmount - remainingAmount,
        installments: purchase.installments,
        remainingCount: remaining.length,
        nextInvoice: next
          ? formatMonthYearBR(next.invoiceMonth, next.invoiceYear)
          : null,
      };
    })
    .filter((item) => item.remainingCount > 0);

  const totalCardDebt = installmentItems.reduce(
    (sum, item) => sum + (item.totalAmount - item.paidAmount),
    0,
  );

  return (
    <>
      <Topbar title="Dívidas" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <FinanceSubNav />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Dívidas avulsas
          </h2>
          <FinancialRecordsSection type="DIVIDA" initialRecords={records} />
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Parcelas do cartão
            </h2>
            {totalCardDebt > 0 && (
              <span className="text-sm text-text-secondary">
                falta pagar{" "}
                <span className="font-semibold text-text-primary">
                  {formatCurrencyBRL(totalCardDebt)}
                </span>
              </span>
            )}
          </div>
          <CardInstallmentsList items={installmentItems} />
        </section>
      </main>
    </>
  );
}
