import { prisma } from "@/lib/prisma";
import { getCreditCard } from "@/lib/finance";
import { daysUntil, invoiceDueDate } from "@/lib/finance-calc";
import { Topbar } from "@/components/layout/Topbar";
import { Card, MonthPicker } from "@/components/ui";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { CreditCardEntriesList } from "@/components/modules/financeiro/CreditCardEntriesList";
import { CreditCardSettings } from "@/components/modules/financeiro/CreditCardSettings";
import { AddCreditCardEntryForm } from "@/components/modules/financeiro/AddCreditCardEntryForm";
import { formatCurrencyBRL, formatUtcDateBR, startOfToday } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string; year?: string }>;

function dueDateLabel(dueDate: Date) {
  const days = daysUntil(dueDate);
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  if (days > 1) return `faltam ${days} dias`;
  if (days === -1) return "venceu ontem";
  return `venceu há ${Math.abs(days)} dias`;
}

export default async function CartaoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = startOfToday();
  const month = params.month ? Number(params.month) : today.getMonth() + 1;
  const year = params.year ? Number(params.year) : today.getFullYear();

  const [entries, businesses, card] = await Promise.all([
    prisma.creditCardEntry.findMany({
      where: { invoiceMonth: month, invoiceYear: year },
      orderBy: { purchaseDate: "desc" },
      include: { business: true },
    }),
    prisma.business.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getCreditCard(),
  ]);

  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const dueDate = card ? invoiceDueDate(month, year, card.dueDay) : null;

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

        <Card className="flex flex-wrap items-center justify-between gap-2">
          {dueDate ? (
            <p className="text-sm text-text-primary">
              {card!.name} · vence em{" "}
              <span className="font-semibold">{formatUtcDateBR(dueDate)}</span>{" "}
              <span className="text-text-secondary">
                ({dueDateLabel(dueDate)})
              </span>
            </p>
          ) : (
            <p className="text-sm text-text-secondary">
              Cadastre o dia de vencimento para acompanhar a fatura.
            </p>
          )}
          <CreditCardSettings card={card} />
        </Card>

        <AddCreditCardEntryForm
          businesses={businesses}
          closingDay={card?.closingDay ?? null}
          invoiceMonth={month}
          invoiceYear={year}
        />

        <Card>
          <CreditCardEntriesList entries={entries} businesses={businesses} />
        </Card>
      </main>
    </>
  );
}
