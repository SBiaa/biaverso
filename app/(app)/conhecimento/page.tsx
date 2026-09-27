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
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <KnowledgeFilters />
        </div>

        <AddKnowledgeForm />

        {items.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nenhum conteúdo cadastrado ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
