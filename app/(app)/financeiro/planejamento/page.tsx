import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMonthPlan } from "@/lib/finance";
import { Topbar } from "@/components/layout/Topbar";
import { Badge, BusinessBadge, Card, MonthPicker, StatCard } from "@/components/ui";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { AddPlannedIncomeForm } from "@/components/modules/financeiro/AddPlannedIncomeForm";
import {
  fixedBillTypeLabels,
  transactionCategoryLabels,
} from "@/lib/labels";
import {
  formatCurrencyBRL,
  formatDateBR,
  parseIntParam,
  todayUtc,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string; year?: string }>;

export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const month = parseIntParam(params.month, 1, 12) ?? today.getUTCMonth() + 1;
  const year = parseIntParam(params.year, 1970, 2999) ?? today.getUTCFullYear();

  const plan = await getMonthPlan(month, year);
  const businesses = await prisma.business.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  // Mês que já passou (ou o corrente) mostra o que de fato foi lançado; mês
  // futuro é previsão em cima das recorrências.
  const previsto = plan.isFuture;
  const cardEntries = plan.invoice.items.filter((i) => i.kind === "AVULSO");

  return (
    <>
      <Topbar title="Planejamento" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <FinanceSubNav />

        <MonthPicker month={month} year={year} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label={previsto ? "Entrou previsto" : "Entrou"}
            value={formatCurrencyBRL(plan.incomeTotal)}
            icon={<TrendingUp size={16} className="text-emerald-600" />}
            valueClassName="text-emerald-600"
          />
          <StatCard
            label={previsto ? "Saiu previsto" : "Saiu"}
            value={formatCurrencyBRL(plan.expenseTotal)}
            icon={<TrendingDown size={16} className="text-red-600" />}
            valueClassName="text-red-600"
          />
          <StatCard
            label={previsto ? "Saldo projetado" : "Saldo do mês"}
            value={formatCurrencyBRL(plan.balance)}
            icon={<Wallet size={16} className="text-text-secondary" />}
            valueClassName={
              plan.balance >= 0 ? "text-emerald-600" : "text-red-600"
            }
          />
        </div>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-text-primary">
            Como o &quot;saiu&quot; foi somado
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-text-secondary">
                Contas fixas ({plan.fixedBills.length})
              </span>
              <span className="text-text-primary">
                {formatCurrencyBRL(plan.fixedBillsTotal)}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-text-secondary">
                Cartão — compras e parcelas
              </span>
              <span className="text-text-primary">
                {formatCurrencyBRL(plan.invoice.entriesTotal)}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-text-secondary">
                Outras saídas lançadas ({plan.expenses.length})
              </span>
              <span className="text-text-primary">
                {formatCurrencyBRL(plan.expenseTransactionsTotal)}
              </span>
            </li>
          </ul>
          <p className="mt-2 text-xs text-text-secondary">
            As assinaturas no cartão ({formatCurrencyBRL(plan.invoice.subscriptionsTotal)})
            entram só uma vez, junto das contas fixas. Transações da categoria
            &quot;Cartão de crédito&quot; ficam de fora porque são o pagamento da
            fatura, que já está contada aqui.
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Contas fixas do mês
              </h2>
              {plan.fixedBills.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nenhuma conta fixa ativa.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {plan.fixedBills.map((bill) => (
                    <li
                      key={bill.logId}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div>
                        <p className="text-text-primary">{bill.name}</p>
                        <p className="text-xs text-text-secondary">
                          {fixedBillTypeLabels[bill.type]} · dia {bill.dueDay}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {bill.paymentMethod === "CARTAO_CREDITO" && (
                          <Badge className="bg-badge-tarot-bg text-badge-tarot-text">
                            Cartão
                          </Badge>
                        )}
                        <span className="font-medium text-text-primary">
                          {formatCurrencyBRL(bill.amount)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Cartão de crédito — projeção
              </h2>
              {plan.invoice.items.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nada previsto na fatura deste mês.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {cardEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-text-primary">
                        {entry.description}
                        {entry.installment ? ` (${entry.installment})` : ""}
                      </span>
                      <span className="font-medium text-text-primary">
                        {formatCurrencyBRL(entry.amount)}
                      </span>
                    </li>
                  ))}
                  {plan.invoice.subscriptionsTotal > 0 && (
                    <li className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-secondary">
                        Assinaturas no cartão (já contadas nas contas fixas)
                      </span>
                      <span className="text-text-secondary">
                        {formatCurrencyBRL(plan.invoice.subscriptionsTotal)}
                      </span>
                    </li>
                  )}
                  <li className="flex items-center justify-between gap-3 border-t border-border pt-2 text-sm font-semibold">
                    <span className="text-text-primary">Total da fatura</span>
                    <span className="text-text-primary">
                      {formatCurrencyBRL(plan.invoice.total)}
                    </span>
                  </li>
                </ul>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                {previsto ? "Entradas previstas" : "Entradas"}
              </h2>
              {plan.incomes.length === 0 ? (
                <p className="mb-3 text-sm text-text-secondary">
                  {previsto
                    ? "Sem previsão de entrada para este mês ainda."
                    : "Nenhuma entrada lançada neste mês."}
                </p>
              ) : (
                <ul className="mb-3 flex flex-col gap-2">
                  {plan.incomes.map((income) => (
                    <li
                      key={income.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <BusinessBadge business={income.business} />
                        <div>
                          <p className="text-text-primary">{income.name}</p>
                          <p className="text-xs text-text-secondary">
                            {formatDateBR(new Date(income.date))} ·{" "}
                            {transactionCategoryLabels[income.category]}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium text-emerald-600">
                        {formatCurrencyBRL(income.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <AddPlannedIncomeForm
                businesses={businesses}
                month={month}
                year={year}
              />
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Outras saídas lançadas
              </h2>
              {plan.expenses.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nenhuma saída avulsa lançada neste mês.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {plan.expenses.map((expense) => (
                    <li
                      key={expense.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <BusinessBadge business={expense.business} />
                        <div>
                          <p className="text-text-primary">{expense.name}</p>
                          <p className="text-xs text-text-secondary">
                            {formatDateBR(new Date(expense.date))} ·{" "}
                            {transactionCategoryLabels[expense.category]}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium text-red-600">
                        {formatCurrencyBRL(expense.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        {plan.incomes.length === 0 && plan.expenses.length === 0 && (
          <Card>
            <p className="text-sm text-text-secondary">
              Nenhuma transação lançada ainda para este mês — os valores acima
              são baseados nas contas fixas e nas parcelas já cadastradas.
            </p>
          </Card>
        )}
      </main>
    </>
  );
}
