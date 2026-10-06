import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { PillarsTable, type PillarRow } from "@/components/modules/visao/PillarsTable";
import {
  ConceptualGoalsTable,
  type ConceptualRow,
} from "@/components/modules/visao/ConceptualGoalsTable";
import {
  MeasuredGoalsTable,
  type MeasuredRow,
} from "@/components/modules/visao/MeasuredGoalsTable";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "pilares", label: "Pilares" },
  { id: "conceituais", label: "Objetivos conceituais" },
  { id: "metrificados", label: "Objetivos metrificados" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function VisaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : "pilares";

  const [pillars, conceptualGoals, measuredGoals, levels, businesses] = await Promise.all([
    prisma.pillar.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        icon: true,
        status: true,
        kind: true,
        businesses: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, color: true },
        },
        conceptualGoals: {
          select: {
            measuredGoals: { where: { status: "EM_ANDAMENTO" }, select: { id: true } },
          },
        },
      },
    }),
    prisma.conceptualGoal.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        priorityLevelId: true,
        category: true,
        challenge: true,
        pillarId: true,
        pillar: { select: { name: true, color: true } },
        _count: { select: { measuredGoals: true } },
      },
    }),
    prisma.measuredGoal.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        term: true,
        deadline: true,
        target: true,
        targetValue: true,
        currentValue: true,
        unit: true,
        progress: true,
        conceptualGoalId: true,
        businessId: true,
      },
    }),
    prisma.priorityLevel.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true, color: true, order: true },
    }),
    prisma.business.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  const pillarRows: PillarRow[] = pillars.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    icon: p.icon,
    status: p.status,
    kind: p.kind,
    inProgressCount: p.conceptualGoals.reduce((sum, g) => sum + g.measuredGoals.length, 0),
    businesses: p.businesses,
  }));

  const conceptualRows: ConceptualRow[] = conceptualGoals.map((g) => ({
    id: g.id,
    title: g.title,
    status: g.status,
    priorityLevelId: g.priorityLevelId,
    category: g.category,
    challenge: g.challenge,
    pillarId: g.pillarId,
    measuredCount: g._count.measuredGoals,
  }));

  const measuredRows: MeasuredRow[] = measuredGoals.map((g) => ({
    ...g,
    deadline: g.deadline ? g.deadline.toISOString() : null,
  }));

  const counts: Record<TabId, number> = {
    pilares: pillarRows.length,
    conceituais: conceptualRows.length,
    metrificados: measuredRows.length,
  };

  // As tabelas guardam as linhas em estado (para editar na célula sem recarregar).
  // A chave com o conteúdo faz a tabela recomeçar quando o servidor devolve dados
  // novos — por exemplo depois que um modal grava e dá `router.refresh()`.
  const keyOf = (value: unknown) => JSON.stringify(value);

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

        <nav className="flex flex-wrap gap-1.5" aria-label="Tabelas da Central de Visão">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/visao?tab=${t.id}`}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-accent bg-accent text-accent-contrast"
                  : "border-border text-text-secondary hover:text-text-primary",
              )}
            >
              {t.label} · {counts[t.id]}
            </Link>
          ))}
        </nav>

        <Card>
          {tab === "pilares" && (
            <PillarsTable key={keyOf(pillarRows)} initialRows={pillarRows} />
          )}
          {tab === "conceituais" && (
            <ConceptualGoalsTable
              key={keyOf(conceptualRows)}
              initialRows={conceptualRows}
              pillars={pillars.map((p) => ({ id: p.id, name: p.name, color: p.color }))}
              levels={levels}
            />
          )}
          {tab === "metrificados" && (
            <MeasuredGoalsTable
              key={keyOf(measuredRows)}
              initialRows={measuredRows}
              conceptualGoals={conceptualGoals.map((g) => ({
                id: g.id,
                title: g.title,
                pillarName: g.pillar.name,
                pillarColor: g.pillar.color,
              }))}
              businesses={businesses}
            />
          )}
        </Card>
      </main>
    </>
  );
}
