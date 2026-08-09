import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { FinanceSubNav } from "@/components/modules/financeiro/FinanceSubNav";
import { FinancialRecordsSection } from "@/components/modules/financeiro/FinancialRecordsSection";

export const dynamic = "force-dynamic";

export default async function DividasPage() {
  const records = await prisma.financialRecord.findMany({
    where: { type: "DIVIDA" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Topbar title="Dívidas" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <FinanceSubNav />
        <FinancialRecordsSection type="DIVIDA" initialRecords={records} />
      </main>
    </>
  );
}
