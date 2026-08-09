import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, MonthPicker } from "@/components/ui";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { CreditCardEntriesList } from "@/components/modules/financeiro/CreditCardEntriesList";
import { formatCurrencyBRL, startOfToday } from "@/lib/utils";

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

  const [entries, businesses] = await Promise.all([
    prisma.creditCardEntry.findMany({
      where: { invoiceMonth: month, invoiceYear: year },
      orderBy: { purchaseDate: "desc" },
      include: { business: true },
    }),
    prisma.business.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

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
          <CreditCardEntriesList entries={entries} businesses={businesses} />
        </Card>
      </main>
    </>
  );
}
