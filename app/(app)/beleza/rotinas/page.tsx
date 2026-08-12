import { Topbar } from "@/components/layout/Topbar";
import { BelezaSubNav } from "@/components/modules/beleza/BelezaSubNav";
import { RoutineManager } from "@/components/modules/beleza/RoutineManager";
import { getAllRoutines, getProductOptions } from "@/lib/beleza";

export const dynamic = "force-dynamic";

export default async function BelezaRotinasPage() {
  const [routines, products] = await Promise.all([
    getAllRoutines(),
    getProductOptions(),
  ]);

  return (
    <>
      <Topbar title="Rotinas de autocuidado" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <h1 className="text-lg font-semibold text-text-primary md:hidden">
          Rotinas
        </h1>

        <BelezaSubNav />

        <p className="text-sm text-text-secondary">
          O que se repete todo dia. Arraste os passos para mudar a ordem.
        </p>

        <RoutineManager routines={routines} products={products} />
      </main>
    </>
  );
}
