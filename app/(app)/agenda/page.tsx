import { Topbar } from "@/components/layout/Topbar";
import { AgendaBoard } from "@/components/modules/agenda/AgendaBoard";
import { SyncNowButton } from "@/components/modules/agenda/SyncNowButton";
import { getAgendaEvents } from "@/lib/agenda";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const events = await getAgendaEvents();

  return (
    <>
      <Topbar title="Agenda" action={<SyncNowButton variant="secondary" />} />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        {/* No mobile não existe Topbar, então o botão aparece aqui. */}
        <div className="md:hidden">
          <SyncNowButton variant="secondary" />
        </div>

        <AgendaBoard initialEvents={events} />
      </main>
    </>
  );
}
