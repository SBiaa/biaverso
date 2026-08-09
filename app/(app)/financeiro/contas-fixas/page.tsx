import { prisma } from "@/lib/prisma";
import { ensureFixedBillLogsForMonth } from "@/lib/finance";
import { Topbar } from "@/components/layout/Topbar";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { FixedBillList } from "@/components/modules/financeiro/FixedBillList";
import { startOfToday } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContasFixasPage() {
  const date = startOfToday();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  await ensureFixedBillLogsForMonth(month, year);

  const logs = await prisma.fixedBillLog.findMany({
    where: { month, year },
    include: { fixedBill: true },
    orderBy: { fixedBill: { dueDay: "asc" } },
  });

  const items = logs.map((log) => ({
    logId: log.id,
    fixedBillId: log.fixedBillId,
    name: log.fixedBill.name,
    amount: log.fixedBill.amount,
    dueDay: log.fixedBill.dueDay,
    type: log.fixedBill.type,
    notes: log.fixedBill.notes,
    status: log.status,
  }));

  return (
    <>
      <Topbar title="Contas fixas" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <FinanceSubNav />
        {items.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nenhuma conta fixa cadastrada.
          </p>
        ) : (
          <FixedBillList items={items} />
        )}
      </main>
    </>
  );
}
