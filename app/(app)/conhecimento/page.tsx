import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { KnowledgeFilters } from "@/components/modules/conhecimento/KnowledgeFilters";
import { AddKnowledgeForm } from "@/components/modules/conhecimento/AddKnowledgeForm";
import { KnowledgeCard } from "@/components/modules/conhecimento/KnowledgeCard";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ type?: string; area?: string; status?: string }>;

export default async function ConhecimentoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const where: Prisma.KnowledgeWhereInput = {};
  if (params.type) where.type = params.type as Prisma.KnowledgeWhereInput["type"];
  if (params.area) where.area = params.area as Prisma.KnowledgeWhereInput["area"];
  if (params.status) where.status = params.status as Prisma.KnowledgeWhereInput["status"];

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
              <KnowledgeCard
                key={item.id}
                item={{
                  ...item,
                  startedAt: item.startedAt ? item.startedAt.toISOString() : null,
                  finishedAt: item.finishedAt ? item.finishedAt.toISOString() : null,
                }}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
