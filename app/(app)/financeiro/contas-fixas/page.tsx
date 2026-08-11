import { prisma } from "@/lib/prisma";
import { ensureFixedBillLogsForMonth } from "@/lib/finance";
import { billAmountForMonth, unpaidStatus } from "@/lib/finance-calc";
import { Topbar } from "@/components/layout/Topbar";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { FixedBillList } from "@/components/modules/financeiro/FixedBillList";
import { todayUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContasFixasPage() {
  const date = todayUtc();
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();

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

  return (
    <>
      <Topbar title="Contas fixas" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <FinanceSubNav />
        <FixedBillList items={items} />
      </main>
    </>
  );
}
