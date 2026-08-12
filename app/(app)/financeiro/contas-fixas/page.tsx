import { prisma } from "@/lib/prisma";
import { ensureFixedBillLogsForMonth } from "@/lib/finance";
import { billAmountForMonth, unpaidStatus } from "@/lib/finance-calc";
import { Topbar } from "@/components/layout/Topbar";
import { Card, MonthPicker } from "@/components/ui";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { FixedBillList } from "@/components/modules/financeiro/FixedBillList";
import { formatCurrencyBRL, parseIntParam, todayUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string; year?: string }>;

export default async function ContasFixasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const month = parseIntParam(params.month, 1, 12) ?? today.getUTCMonth() + 1;
  const year = parseIntParam(params.year, 1970, 2999) ?? today.getUTCFullYear();

  await ensureFixedBillLogsForMonth(month, year);

  const [logs, invoice] = await Promise.all([
    prisma.fixedBillLog.findMany({
      where: { month, year },
      include: { fixedBill: true },
      orderBy: { dueDate: "asc" },
    }),
    // Assinatura no cartão não é paga sozinha — o status dela é o da fatura.
    prisma.creditCardInvoice.findUnique({
      where: { month_year: { month, year } },
    }),
  ]);

  const invoicePaid = invoice?.status === "PAGA";

  const items = logs.map((log) => ({
    logId: log.id,
    fixedBillId: log.fixedBillId,
    name: log.fixedBill.name,
    amount: billAmountForMonth(log.amountOverride, log.fixedBill.amount),
    defaultAmount: log.fixedBill.amount,
    amountOverride: log.amountOverride,
    dueDate: log.dueDate.toISOString(),
    type: log.fixedBill.type,
    paymentMethod: log.fixedBill.paymentMethod,
    notes: log.fixedBill.notes,
    // No cartão, quem manda é a fatura — o status do log é ignorado.
    status:
      log.fixedBill.paymentMethod === "CARTAO_CREDITO"
        ? invoicePaid
          ? ("PAGO" as const)
          : unpaidStatus(log.dueDate)
        : log.status,
  }));

  const total = items.reduce((acc, i) => acc + i.amount, 0);
  const pendingTotal = items
    .filter((i) => i.status !== "PAGO")
    .reduce((acc, i) => acc + i.amount, 0);

  return (
    <>
      <Topbar title="Contas fixas" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <FinanceSubNav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthPicker month={month} year={year} />
          <span className="text-sm font-semibold text-text-primary">
            Total do mês: {formatCurrencyBRL(total)}
          </span>
        </div>

        {items.length > 0 && (
          <Card className="text-sm text-text-primary">
            {pendingTotal > 0 ? (
              <>
                Falta pagar{" "}
                <span className="font-semibold">
                  {formatCurrencyBRL(pendingTotal)}
                </span>{" "}
                neste mês.
              </>
            ) : (
              "Tudo pago neste mês."
            )}
          </Card>
        )}

        {/* A lista guarda os itens em estado próprio para a marcação otimista,
            então trocar de mês precisa remontá-la — sem a key ela continuaria
            mostrando as contas do mês anterior. */}
        <FixedBillList key={`${year}-${month}`} items={items} />
      </main>
    </>
  );
}
