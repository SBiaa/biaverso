import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { KnowledgeFilters } from "@/components/modules/conhecimento/KnowledgeFilters";
import { AddKnowledgeForm } from "@/components/modules/conhecimento/AddKnowledgeForm";
import { knowledgeAreaLabels, knowledgeTypeLabels } from "@/lib/labels";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ type?: string; area?: string }>;

export default async function ConhecimentoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const where: Prisma.KnowledgeWhereInput = {};
  if (params.type) where.type = params.type as Prisma.KnowledgeWhereInput["type"];
  if (params.area) where.area = params.area as Prisma.KnowledgeWhereInput["area"];

  const items = await prisma.knowledge.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Topbar title="Conhecimento" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <KnowledgeFilters />
        </div>

        <AddKnowledgeForm />

        {items.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nenhum conteúdo cadastrado ainda.
          </p>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {items.map((item) => (
              <Card key={item.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">
                    {item.title}
                  </p>
                  <span className="shrink-0 text-xs text-text-secondary">
                    {knowledgeTypeLabels[item.type]}
                  </span>
                </div>
                <span className="w-fit rounded-full bg-badge-pessoal-bg px-2 py-0.5 text-xs font-medium text-badge-pessoal-text">
                  {knowledgeAreaLabels[item.area]}
                </span>
                {item.source && (
                  <p className="text-xs text-text-secondary">{item.source}</p>
                )}
                {item.summary && (
                  <p className="text-xs text-text-secondary">{item.summary}</p>
                )}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-accent"
                  >
                    Abrir link
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
