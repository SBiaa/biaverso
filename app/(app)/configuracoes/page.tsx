import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { RoutineTemplateList } from "@/components/modules/configuracoes/RoutineTemplateList";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const templates = await prisma.task.findMany({
    where: { dayId: null, type: { in: ["ROTINA_NORMAL", "ROTINA_FAXINA"] } },
    orderBy: { order: "asc" },
    select: { id: true, title: true, type: true },
  });

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
        </div>
      </main>
    </>
  );
}
