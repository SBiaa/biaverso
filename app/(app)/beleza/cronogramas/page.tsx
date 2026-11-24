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
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">

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
