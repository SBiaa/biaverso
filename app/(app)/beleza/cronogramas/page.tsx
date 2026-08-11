import { Topbar } from "@/components/layout/Topbar";
import { BelezaSubNav } from "@/components/modules/beleza/BelezaSubNav";
import { ScheduleManager } from "@/components/modules/beleza/ScheduleManager";
import { getProductOptions, getSchedules } from "@/lib/beleza";

export const dynamic = "force-dynamic";

export default async function BelezaCronogramasPage() {
  const [schedules, products] = await Promise.all([
    getSchedules(),
    getProductOptions(),
  ]);

  return (
    <>
      <Topbar title="Cronogramas" />
      <main className="flex-1 space-y-4 p-4 md:p-6 md:max-w-3xl">
        <h1 className="text-lg font-semibold text-text-primary md:hidden">
          Cronogramas
        </h1>

        <BelezaSubNav />

        <p className="text-sm text-text-secondary">
          Ciclos que giram sozinhos: cada etapa registrada avança para a próxima
          e, no fim, volta ao começo.
        </p>

        <ScheduleManager schedules={schedules} products={products} />
      </main>
    </>
  );
}
