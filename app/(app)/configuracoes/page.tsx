import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { RoutineTemplateList } from "@/components/modules/configuracoes/RoutineTemplateList";
import { HabitList } from "@/components/modules/configuracoes/HabitList";
import { GoogleCalendarCard } from "@/components/modules/agenda/GoogleCalendarCard";
import { getGoogleSyncStatus } from "@/lib/agenda";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { google } = await searchParams;

  const [googleStatus, templates, habits] = await Promise.all([
    getGoogleSyncStatus(),
    prisma.task.findMany({
      where: { dayId: null, type: { in: ["ROTINA_NORMAL", "ROTINA_FAXINA"] } },
      orderBy: { order: "asc" },
      select: { id: true, title: true, type: true },
    }),
    prisma.habit.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ]);

  const normal = templates.filter((t) => t.type === "ROTINA_NORMAL");
  const faxina = templates.filter((t) => t.type === "ROTINA_FAXINA");

  return (
    <>
      <Topbar title="Configurações" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RoutineTemplateList
            type="ROTINA_NORMAL"
            title="Dia Normal — tarefas padrão"
            initialItems={normal}
          />
          <RoutineTemplateList
            type="ROTINA_FAXINA"
            title="Dia de Faxina — tarefas padrão"
            initialItems={faxina}
          />
          <HabitList initialItems={habits} />
          <GoogleCalendarCard status={googleStatus} feedback={google} />
        </div>
      </main>
    </>
  );
}
