import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { YearPlanner, type YearPlanData } from "@/components/modules/ano/YearPlanner";

export const dynamic = "force-dynamic";

export default async function AnoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano } = await searchParams;
  // De outubro em diante o que interessa é o ano que vem.
  const now = new Date();
  const fallback = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
  const parsed = Number(ano);
  const year = Number.isInteger(parsed) && parsed > 2000 && parsed < 2100 ? parsed : fallback;

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const [plan, pillars] = await Promise.all([
    prisma.yearPlan.findUnique({ where: { year } }),
    prisma.pillar.findMany({
      where: { status: "ATIVO" },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        conceptualGoals: {
          select: {
            measuredGoals: {
              where: { deadline: { gte: start, lt: end } },
              orderBy: { deadline: "asc" },
              select: { id: true, title: true, deadline: true, status: true },
            },
          },
        },
      },
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
