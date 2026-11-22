import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { PillarHeader } from "@/components/modules/visao/PillarHeader";
import { MoodboardSection } from "@/components/modules/visao/MoodboardSection";
import { PrinciplesSection } from "@/components/modules/visao/PrinciplesSection";
import { GoalsSection } from "@/components/modules/visao/GoalsSection";
import { DesiresSection } from "@/components/modules/visao/DesiresSection";
import { PillarBrainstormSection } from "@/components/modules/visao/PillarBrainstormSection";
import type { BrainstormItemDTO } from "@/components/modules/ano/brainstorm-shared";
import { planningYear } from "@/lib/year-plan";

export const dynamic = "force-dynamic";

export default async function PillarDetailPage({
  params,
}: {
  params: Promise<{ pillarId: string }>;
}) {
  const { pillarId } = await params;

  const [levels, businesses] = await Promise.all([
    prisma.priorityLevel.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true, color: true, order: true },
    }),
    prisma.business.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const pillar = await prisma.pillar.findUnique({
    where: { id: pillarId },
    include: {
      moodboardItems: { orderBy: { order: "asc" } },
      principles: { orderBy: { createdAt: "desc" } },
      desires: { orderBy: { createdAt: "desc" } },
      conceptualGoals: {
        orderBy: { createdAt: "desc" },
        include: { measuredGoals: { orderBy: { deadline: "asc" } } },
      },
    },
  });

  if (!pillar) notFound();

  // Rascunhos do despejo deste pilar: do ano em planejamento e do anterior
  // (em novembro, os de 2026 e 2027). Os soltos ficam de fora.
  const year = planningYear();
  const brainstormItems = await prisma.brainstormItem.findMany({
    where: {
      pillarId,
      year: { gte: year - 1 },
      // `not: SOLTAR` sozinho deixaria de fora os ainda não separados (NULL).
      OR: [{ decision: null }, { decision: { not: "SOLTAR" } }],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      year: true,
      text: true,
      decision: true,
      pillarId: true,
      measuredGoalId: true,
      desireId: true,
    },
  });

  const conceptualGoals = pillar.conceptualGoals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    priorityLevelId: goal.priorityLevelId,
    category: goal.category,
    challenge: goal.challenge,
    measuredGoals: goal.measuredGoals.map((measured) => ({
      id: measured.id,
      title: measured.title,
      target: measured.target,
      deadline: measured.deadline ? measured.deadline.toISOString() : null,
      status: measured.status,
      progress: measured.progress,
      term: measured.term,
      targetValue: measured.targetValue,
      currentValue: measured.currentValue,
      unit: measured.unit,
      businessId: measured.businessId,
      lesson: measured.lesson,
    })),
  }));

  return (
    <>
      <Topbar
        width="narrow"
        title={pillar.name}
        trail={[{ label: "Central de Visão", href: "/visao" }]}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-5 md:px-8 md:py-8">
        <PillarHeader pillar={pillar} />
        <MoodboardSection
          pillarId={pillar.id}
          color={pillar.color}
          initialItems={pillar.moodboardItems}
        />
        <PrinciplesSection pillarId={pillar.id} initialPrinciples={pillar.principles} />
        <PillarBrainstormSection
          pillar={{ id: pillar.id, name: pillar.name }}
          year={year}
          initialItems={brainstormItems as BrainstormItemDTO[]}
          conceptualGoals={pillar.conceptualGoals.map((c) => ({
            id: c.id,
            title: c.title,
            pillarId: pillar.id,
            pillarName: pillar.name,
          }))}
        />
        {/* As seções guardam a lista em estado: a chave com o conteúdo faz
            recomeçar quando um rascunho vira meta ou desejo (router.refresh). */}
        <div id="objetivos" className="scroll-mt-20">
          <GoalsSection
            key={JSON.stringify(conceptualGoals)}
            pillarId={pillar.id}
            initialGoals={conceptualGoals}
            levels={levels}
            businesses={businesses}
          />
        </div>
        <DesiresSection
          key={JSON.stringify(pillar.desires.map((d) => d.id))}
          pillarId={pillar.id}
          initialDesires={pillar.desires}
        />
      </main>
    </>
  );
}
