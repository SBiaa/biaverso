import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardTitle } from "@/components/ui";
import { PillarGrid } from "@/components/modules/visao/PillarGrid";
import { MeasuredGoalsOverview } from "@/components/modules/visao/MeasuredGoalsOverview";

export const dynamic = "force-dynamic";

export default async function VisaoPage() {
  const [pillars, measuredGoals] = await Promise.all([
    prisma.pillar.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        conceptualGoals: {
          include: { measuredGoals: { where: { status: "EM_ANDAMENTO" } } },
        },
      },
    }),
    prisma.measuredGoal.findMany({
      include: { conceptualGoal: { include: { pillar: true } } },
    }),
  ]);

  const pillarItems = pillars.map((pillar) => ({
    id: pillar.id,
    name: pillar.name,
    description: pillar.description,
    color: pillar.color,
    icon: pillar.icon,
    inProgressCount: pillar.conceptualGoals.reduce(
      (sum, goal) => sum + goal.measuredGoals.length,
      0,
    ),
  }));

  const overviewItems = measuredGoals
    .map((goal) => ({
      id: goal.id,
      title: goal.title,
      target: goal.target,
      deadline: goal.deadline,
      progress: goal.progress,
      status: goal.status,
      pillar: {
        id: goal.conceptualGoal.pillar.id,
        name: goal.conceptualGoal.pillar.name,
        color: goal.conceptualGoal.pillar.color,
        icon: goal.conceptualGoal.pillar.icon,
      },
    }))
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.getTime() - b.deadline.getTime();
    });

  return (
    <>
      <Topbar title="Central de Visão" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <Card className="flex flex-col gap-1">
          <h1 className="text-base font-semibold text-text-primary">Central de Visão</h1>
          <p className="text-sm text-text-secondary">
            Conecte os grandes propósitos da sua vida com as ações do dia a dia.
          </p>
        </Card>

        <section className="flex flex-col gap-3">
          <CardTitle>Pilares</CardTitle>
          <PillarGrid pillars={pillarItems} />
        </section>

        <section className="flex flex-col gap-3">
          <CardTitle>
            Objetivos metrificados
          </CardTitle>
          <MeasuredGoalsOverview goals={overviewItems} />
        </section>
      </main>
    </>
  );
}
