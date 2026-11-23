import { prisma } from "@/lib/prisma";
import { planningYear } from "@/lib/year-plan";
import { Topbar } from "@/components/layout/Topbar";
import { YearPlanner, type YearPlanData } from "@/components/modules/ano/YearPlanner";
import type { BrainstormItemDTO } from "@/components/modules/ano/BrainstormSection";

export const dynamic = "force-dynamic";

export default async function AnoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano } = await searchParams;
  const fallback = planningYear();
  const parsed = Number(ano);
  const year = Number.isInteger(parsed) && parsed > 2000 && parsed < 2100 ? parsed : fallback;

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const [plan, pillars, brainstormItems, carryCandidates] = await Promise.all([
    prisma.yearPlan.findUnique({ where: { year } }),
    prisma.pillar.findMany({
      where: { status: "ATIVO" },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        conceptualGoals: {
          orderBy: { title: "asc" },
          select: {
            id: true,
            title: true,
            measuredGoals: {
              where: { deadline: { gte: start, lt: end } },
              orderBy: { deadline: "asc" },
              select: { id: true, title: true, deadline: true, status: true },
            },
          },
        },
      },
    }),
    prisma.brainstormItem.findMany({
      where: { year },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        year: true,
        text: true,
        decision: true,
        pillarId: true,
        measuredGoalId: true,
        desireId: true,
        conceptualGoalId: true,
        organizedAt: true,
      },
    }),
    // O que ficou para "Depois" no ano anterior e ainda não foi trazido.
    prisma.brainstormItem.findMany({
      where: { year: year - 1, decision: "DEPOIS", carriedTo: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, text: true },
    }),
  ]);

  const data: YearPlanData = {
    word: plan?.word ?? "",
    retro: (plan?.retro ?? {}) as YearPlanData["retro"],
    pillarNotes: (plan?.pillarNotes ?? {}) as Record<string, string>,
    dates: (plan?.dates ?? []) as YearPlanData["dates"],
    incomeTarget: plan?.incomeTarget ?? null,
    savingsTarget: plan?.savingsTarget ?? null,
    budgetNotes: plan?.budgetNotes ?? "",
  };

  return (
    <>
      <Topbar title={`Planejamento ${year}`} />
      <YearPlanner
        key={year}
        year={year}
        initial={data}
        brainstorm={{
          items: brainstormItems.map(
            (i): BrainstormItemDTO => ({ ...i, organizedAt: i.organizedAt?.toISOString() ?? null }),
          ),
          carryCandidates,
          conceptualGoals: pillars.flatMap((p) =>
            p.conceptualGoals.map((c) => ({
              id: c.id,
              title: c.title,
              pillarId: p.id,
              pillarName: p.name,
            })),
          ),
        }}
        pillars={pillars.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          goals: p.conceptualGoals
            .flatMap((c) => c.measuredGoals)
            .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime())
            .map((g) => ({
              id: g.id,
              title: g.title,
              status: g.status,
              deadline: g.deadline!.toISOString(),
            })),
        }))}
      />
    </>
  );
}
