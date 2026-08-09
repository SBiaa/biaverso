import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, BusinessBadge, MonthPicker } from "@/components/ui";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { formatCurrencyBRL, formatDateBR, startOfToday } from "@/lib/utils";
import { transactionCategoryLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string; year?: string }>;

export default async function CartaoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = startOfToday();
  const month = params.month ? Number(params.month) : today.getMonth() + 1;
  const year = params.year ? Number(params.year) : today.getFullYear();

  const entries = await prisma.creditCardEntry.findMany({
    where: { invoiceMonth: month, invoiceYear: year },
    orderBy: { purchaseDate: "desc" },
    include: { business: true },
  });

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <Topbar title="Cartão de crédito" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <FinanceSubNav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthPicker month={month} year={year} />
          <span className="text-sm font-semibold text-text-primary">
            Total da fatura: {formatCurrencyBRL(total)}
          </span>
        </div>

        <Card>
          {entries.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhum lançamento neste mês.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <BusinessBadge business={entry.business} />
                    <div>
                      <p className="text-text-primary">{entry.description}</p>
                      <p className="text-xs text-text-secondary">
                        {formatDateBR(entry.purchaseDate)} ·{" "}
                        {transactionCategoryLabels[entry.category]}
                        {entry.installment ? ` · ${entry.installment}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-text-primary">
                    {formatCurrencyBRL(entry.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
