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
      <main className="flex-1 space-y-4 p-4 md:p-6 md:max-w-3xl">
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
