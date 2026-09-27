import { Sparkles } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { cardColumns } from "@/components/layout/page-width";
import { Card } from "@/components/ui";
import { getRadar } from "@/lib/radar";
import {
  RadarHabits,
  RadarProjects,
  RadarRoutines,
  RadarTasks,
} from "@/components/modules/radar/RadarLists";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const radar = await getRadar();

  return (
    <>
      <Topbar title="Radar" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        {radar.total === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <Sparkles size={28} className="text-emerald-600" />
            <p className="text-sm font-medium text-text-primary">
              Nada parado por aqui.
            </p>
            <p className="max-w-sm text-xs text-text-secondary">
              Nenhuma tarefa vencida, nenhum projeto ativo sem movimento e os
              hábitos em dia nos dias que você registrou.
            </p>
          </Card>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              O que você começou e parou, olhando{" "}
              {radar.windowDays === 1
                ? "o último dia"
                : `os últimos ${radar.windowDays} dias`}
              . Cada item tem duas saídas: <strong>retomar</strong> ou{" "}
              <strong>deixar ir</strong> — decidir que não é mais para agora
              também é resolver.
            </p>

            <div className={cardColumns}>
              <RadarTasks tasks={radar.tasks} />
              <RadarProjects projects={radar.projects} windowDays={radar.windowDays} />
              <RadarRoutines routines={radar.routines} />
              <RadarHabits habits={radar.habits} />
            </div>
          </>
        )}
      </main>
    </>
  );
}
