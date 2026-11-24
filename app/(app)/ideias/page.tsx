import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { QuickCaptureForm } from "@/components/modules/ideias/QuickCaptureForm";
import { IdeaFilters } from "@/components/modules/ideias/IdeaFilters";
import { IdeaCard } from "@/components/modules/ideias/IdeaCard";
import { IDEA_TABS, type IdeaStatus } from "@/components/modules/ideias/labels";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ businessId?: string; status?: string }>;

/** O que cada aba diz quando está vazia. */
const emptyText: Record<IdeaStatus, string> = {
  SOLTA: "Nenhuma ideia solta. Quando algo surgir, guarde no campo acima.",
  EM_ANALISE: "Nada em análise. Abra uma ideia solta e mude o status para pensar nela com calma.",
  VIROU_PROJETO: "Nenhuma ideia virou projeto ainda. Abra uma ideia de um negócio e use \"Transformar em projeto\".",
  ARQUIVADA: "Nada arquivado.",
};

export default async function IdeiasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status: IdeaStatus = IDEA_TABS.some((t) => t.status === params.status)
    ? (params.status as IdeaStatus)
    : "SOLTA";

  // O filtro de destino vale para a lista e para os números das abas.
  const byDestination: Prisma.IdeaWhereInput = {};
  if (params.businessId === "PESSOAL") byDestination.businessId = null;
  else if (params.businessId) byDestination.businessId = params.businessId;

  const [ideas, grouped, businesses] = await Promise.all([
    prisma.idea.findMany({
      where: { ...byDestination, status },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        businessId: true,
        createdAt: true,
        business: { select: { id: true, name: true, color: true } },
        project: { select: { id: true, name: true, businessId: true } },
      },
    }),
    prisma.idea.groupBy({ by: ["status"], where: byDestination, _count: { _all: true } }),
    prisma.business.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  const counts = Object.fromEntries(
    IDEA_TABS.map((t) => [t.status, grouped.find((g) => g.status === t.status)?._count._all ?? 0]),
  ) as Record<IdeaStatus, number>;

  return (
    <>
      <Topbar title="Ideias" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <QuickCaptureForm businesses={businesses} />

        <IdeaFilters businesses={businesses} active={status} counts={counts} />

        {ideas.length === 0 ? (
          <p className="text-sm text-text-secondary">{emptyText[status]}</p>
        ) : (
          // `auto-rows-fr`: todos os cards com a mesma altura — só com mais de uma
          // coluna; no celular, empilhados, cada um fica do tamanho do que tem.
          <div className="grid gap-3 sm:auto-rows-fr [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={{ ...idea, createdAt: idea.createdAt.toISOString() }}
                businesses={businesses}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
