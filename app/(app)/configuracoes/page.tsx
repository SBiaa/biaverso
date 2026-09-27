import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui";
import { Topbar } from "@/components/layout/Topbar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AccentColorPicker } from "@/components/modules/configuracoes/AccentColorPicker";
import { RoutineTemplateList } from "@/components/modules/configuracoes/RoutineTemplateList";
import { HabitList } from "@/components/modules/configuracoes/HabitList";
import { GoogleCalendarCard } from "@/components/modules/agenda/GoogleCalendarCard";
import { WaterSettingsForm } from "@/components/modules/configuracoes/WaterSettingsForm";
import { PricingSettingsForm } from "@/components/modules/configuracoes/PricingSettingsForm";
import { getGoogleSyncStatus } from "@/lib/agenda";
import { getUserSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { google } = await searchParams;

  const [googleStatus, settings, templates, habits] = await Promise.all([
    getGoogleSyncStatus(),
    getUserSettings(),
    prisma.task.findMany({
      where: { dayId: null, type: { in: ["ROTINA_NORMAL", "ROTINA_FAXINA"] } },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        subtasks: {
          orderBy: { order: "asc" },
          select: { id: true, title: true, done: true },
        },
      },
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
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Tema</CardTitle>
            <p className="text-sm text-text-secondary">
              &ldquo;Sistema&rdquo; acompanha o que o seu computador ou celular
              estiver usando.
            </p>
          </div>
          <ThemeToggle />
        </Card>

        <Card className="flex flex-col gap-3">
          <div>
            <CardTitle>Cor do app</CardTitle>
            <p className="text-sm text-text-secondary">
              Escolha um tom e o resto acompanha: fundo de item selecionado,
              hover dos botões e a cor do texto por cima. A tela muda enquanto
              você experimenta — só vale depois de salvar.
            </p>
          </div>
          <AccentColorPicker initialColor={settings.accentColor} />
        </Card>

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
          <WaterSettingsForm initial={settings} />
          <PricingSettingsForm initial={settings} />
          <GoogleCalendarCard status={googleStatus} feedback={google} />
        </div>
      </main>
    </>
  );
}
