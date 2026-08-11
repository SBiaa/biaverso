import { prisma } from "@/lib/prisma";
import { ensureFixedBillLogsForMonth } from "@/lib/finance";
import { billAmountForMonth } from "@/lib/finance-calc";
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

  const logs = await prisma.fixedBillLog.findMany({
    where: { month, year },
    include: { fixedBill: true },
    orderBy: { dueDate: "asc" },
  });

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
    status: log.status,
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
