import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { PillarHeader } from "@/components/modules/visao/PillarHeader";
import { MoodboardSection } from "@/components/modules/visao/MoodboardSection";
import { PrinciplesSection } from "@/components/modules/visao/PrinciplesSection";
import { GoalsSection } from "@/components/modules/visao/GoalsSection";
import { DesiresSection } from "@/components/modules/visao/DesiresSection";

export const dynamic = "force-dynamic";

export default async function PillarDetailPage({
  params,
}: {
  params: Promise<{ pillarId: string }>;
}) {
  const { pillarId } = await params;

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

  const conceptualGoals = pillar.conceptualGoals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    measuredGoals: goal.measuredGoals.map((measured) => ({
      id: measured.id,
      title: measured.title,
      target: measured.target,
      deadline: measured.deadline ? measured.deadline.toISOString() : null,
      status: measured.status,
      progress: measured.progress,
    })),
  }));

  return (
    <>
      <Topbar title={pillar.name} />
      <main className="flex-1 space-y-6 p-4 md:mx-auto md:max-w-[800px] md:p-6">
        <PillarHeader pillar={pillar} />
        <MoodboardSection
          pillarId={pillar.id}
          color={pillar.color}
          initialItems={pillar.moodboardItems}
        />
        <PrinciplesSection pillarId={pillar.id} initialPrinciples={pillar.principles} />
        <GoalsSection pillarId={pillar.id} initialGoals={conceptualGoals} />
        <DesiresSection pillarId={pillar.id} initialDesires={pillar.desires} />
      </main>
    </>
  );
}
