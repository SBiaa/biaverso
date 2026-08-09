import Link from "next/link";
import { CreditCard, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ensureFixedBillLogsForMonth, getCreditCard } from "@/lib/finance";
import { invoiceDueDate } from "@/lib/finance-calc";
import { Topbar } from "@/components/layout/Topbar";
import { Card, BusinessBadge, StatCard } from "@/components/ui";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { TransactionsList } from "@/components/modules/financeiro/TransactionsList";
import {
  cn,
  formatCurrencyBRL,
  formatUtcDateBR,
  getMonthRange,
  startOfToday,
} from "@/lib/utils";
import { billStatusLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

async function getFinanceData() {
  const date = startOfToday();
  const { start, end } = getMonthRange(date);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  await ensureFixedBillLogsForMonth(month, year);

  const [
    entradas,
    saidas,
    fatura,
    receitaPorNegocioRaw,
    ultimasTransacoes,
    contasPendentes,
    lancamentosCartao,
    businesses,
    card,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "ENTRADA", date: { gte: start, lt: end } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "SAIDA", date: { gte: start, lt: end } },
    }),
    prisma.creditCardEntry.aggregate({
      _sum: { amount: true },
      where: { invoiceMonth: month, invoiceYear: year },
    }),
    prisma.transaction.groupBy({
      by: ["businessId"],
      _sum: { amount: true },
      where: {
        type: "ENTRADA",
        date: { gte: start, lt: end },
        businessId: { not: null },
      },
    }),
    prisma.transaction.findMany({
      orderBy: { date: "desc" },
      take: 8,
      include: { business: true },
    }),
    prisma.fixedBillLog.findMany({
      where: { month, year, status: { in: ["PENDENTE", "ATRASADO"] } },
      include: { fixedBill: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.creditCardEntry.findMany({
      where: { invoiceMonth: month, invoiceYear: year },
      orderBy: { purchaseDate: "desc" },
      include: { business: true },
    }),
    prisma.business.findMany({ where: { active: true } }),
    getCreditCard(),
  ]);

  const businessMap = new Map(businesses.map((b) => [b.id, b]));
  const receitaPorNegocio = receitaPorNegocioRaw
    .filter((item) => item.businessId && businessMap.has(item.businessId))
    .map((item) => ({
      business: businessMap.get(item.businessId as string)!,
      total: item._sum.amount ?? 0,
    }));

  const saldo = (entradas._sum.amount ?? 0) - (saidas._sum.amount ?? 0);

  return {
    entradas: entradas._sum.amount ?? 0,
    saidas: saidas._sum.amount ?? 0,
    saldo,
    fatura: fatura._sum.amount ?? 0,
    receitaPorNegocio,
    ultimasTransacoes,
    contasPendentes,
    lancamentosCartao,
    businesses,
    faturaVenceEm: card ? invoiceDueDate(month, year, card.dueDay) : null,
  };
}

export default async function FinanceiroPage() {
  const data = await getFinanceData();

  return (
    <>
      <Topbar title="Financeiro" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <FinanceSubNav />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Total entrou"
            value={formatCurrencyBRL(data.entradas)}
            icon={<TrendingUp size={16} className="text-emerald-600" />}
            valueClassName="text-emerald-600"
          />
          <StatCard
            label="Total saiu"
            value={formatCurrencyBRL(data.saidas)}
            icon={<TrendingDown size={16} className="text-red-600" />}
            valueClassName="text-red-600"
          />
          <StatCard
            label="Saldo do mês"
            value={formatCurrencyBRL(data.saldo)}
            icon={<Wallet size={16} className="text-text-secondary" />}
            valueClassName={data.saldo >= 0 ? "text-emerald-600" : "text-red-600"}
          />
          <StatCard
            label="Fatura do cartão"
            value={formatCurrencyBRL(data.fatura)}
            icon={<CreditCard size={16} className="text-text-secondary" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Receita por negócio
              </h2>
              {data.receitaPorNegocio.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nenhuma receita este mês.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.receitaPorNegocio.map((item) => (
                    <li
                      key={item.business.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <BusinessBadge business={item.business} />
                      <span className="font-medium text-text-primary">
                        {formatCurrencyBRL(item.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">
                  Últimas transações
                </h2>
                <Link
                  href="/financeiro/transacoes"
                  className="text-xs font-medium text-accent"
                >
                  Ver todas
                </Link>
              </div>
              <TransactionsList
                transactions={data.ultimasTransacoes}
                businesses={data.businesses}
              />
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">
                  Contas pendentes do mês
                </h2>
                <Link
                  href="/financeiro/contas-fixas"
                  className="text-xs font-medium text-accent"
                >
                  Ver todas
                </Link>
              </div>
              {data.contasPendentes.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nenhuma conta pendente.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.contasPendentes.map((log) => (
                    <li
                      key={log.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="text-text-primary">{log.fixedBill.name}</p>
                        <p className="text-xs text-text-secondary">
                          vence em {formatUtcDateBR(log.dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            log.status === "ATRASADO"
                              ? "bg-badge-ace-bg text-badge-ace-text"
                              : "bg-badge-casa-bg text-badge-casa-text",
                          )}
                        >
                          {billStatusLabels[log.status]}
                        </span>
                        <span className="font-medium text-text-primary">
                          {formatCurrencyBRL(log.fixedBill.amount)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">
                  Cartão de crédito do mês
                  {data.faturaVenceEm && (
                    <span className="font-normal text-text-secondary">
                      {" "}
                      · vence em {formatUtcDateBR(data.faturaVenceEm)}
                    </span>
                  )}
                </h2>
                <Link
                  href="/financeiro/cartao"
                  className="text-xs font-medium text-accent"
                >
                  Ver todos
                </Link>
              </div>
              {data.lancamentosCartao.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nenhum lançamento este mês.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.lancamentosCartao.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <BusinessBadge business={entry.business} />
                        <span className="text-text-primary">
                          {entry.description}
                        </span>
                      </div>
                      <span className="font-medium text-text-primary">
                        {formatCurrencyBRL(entry.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
