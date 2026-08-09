import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, BusinessBadge } from "@/components/ui";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { TransactionsFilters } from "@/components/modules/financeiro/TransactionsFilters";
import { AddTransactionForm } from "@/components/modules/financeiro/AddTransactionForm";
import { cn, formatCurrencyBRL, formatDateBR, parseLocalDateString } from "@/lib/utils";
import { transactionCategoryLabels } from "@/lib/labels";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  businessId?: string;
  type?: string;
  category?: string;
  from?: string;
  to?: string;
}>;

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const where: Prisma.TransactionWhereInput = {};
  if (params.businessId === "PESSOAL") where.businessId = null;
  else if (params.businessId) where.businessId = params.businessId;
  if (params.type) where.type = params.type as Prisma.TransactionWhereInput["type"];
  if (params.category)
    where.category = params.category as Prisma.TransactionWhereInput["category"];
  if (params.from || params.to) {
    where.date = {
      ...(params.from ? { gte: parseLocalDateString(params.from) } : {}),
      ...(params.to
        ? { lt: new Date(parseLocalDateString(params.to).getTime() + 86_400_000) }
        : {}),
    };
  }

  const [transactions, businesses] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: { business: true },
    }),
    prisma.business.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Topbar title="Transações" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <FinanceSubNav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <TransactionsFilters businesses={businesses} />
          <AddTransactionForm businesses={businesses} />
        </div>

        <Card>
          {transactions.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhuma transação encontrada.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <BusinessBadge business={t.business} />
                    <div>
                      <p className="text-text-primary">{t.name}</p>
                      <p className="text-xs text-text-secondary">
                        {formatDateBR(t.date)} · {transactionCategoryLabels[t.category]}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "font-medium",
                      t.type === "ENTRADA" ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {t.type === "ENTRADA" ? "+" : "-"}
                    {formatCurrencyBRL(t.amount)}
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
