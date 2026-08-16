import { Topbar } from "@/components/layout/Topbar";
import { BelezaSubNav } from "@/components/modules/beleza/BelezaSubNav";
import { AppointmentManager } from "@/components/modules/beleza/AppointmentManager";
import { getAppointments } from "@/lib/beleza";

export const dynamic = "force-dynamic";

export default async function BelezaCuidadosPage() {
  // Inclui os inativos: esta é a tela de gerenciar, não a de pendências.
  const appointments = await getAppointments({ onlyActive: false });

  return (
    <>
      <Topbar title="Cuidados agendados" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">

        <BelezaSubNav />

        <p className="text-sm text-text-secondary">
          Unhas, cabelo, depilação — o que se repete a cada tantos dias.
        </p>

        <AppointmentManager appointments={appointments} />
      </main>
    </>
  );
}
