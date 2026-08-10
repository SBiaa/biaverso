import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { TransactionsFilters } from "@/components/modules/financeiro/TransactionsFilters";
import { AddTransactionForm } from "@/components/modules/financeiro/AddTransactionForm";
import { TransactionsList } from "@/components/modules/financeiro/TransactionsList";
import { nextUtcDay, parseDateOnly } from "@/lib/utils";
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
  const from = params.from ? parseDateOnly(params.from) : null;
  const to = params.to ? parseDateOnly(params.to) : null;
  if (from || to) {
    where.date = {
      ...(from ? { gte: from } : {}),
      // `to` é inclusivo para a usuária: filtra até o fim daquele dia.
      ...(to ? { lt: nextUtcDay(to) } : {}),
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
          <TransactionsList transactions={transactions} businesses={businesses} />
        </Card>
      </main>
    </>
  );
}
