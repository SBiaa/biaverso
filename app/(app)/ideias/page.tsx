import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, BusinessBadge } from "@/components/ui";
import { QuickCaptureForm } from "@/components/modules/ideias/QuickCaptureForm";
import { IdeaFilters } from "@/components/modules/ideias/IdeaFilters";
import { IdeaStatusToggle } from "@/components/modules/ideias/IdeaStatusToggle";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ businessId?: string; status?: string }>;

export default async function IdeiasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const where: Prisma.IdeaWhereInput = {};
  if (params.businessId === "PESSOAL") where.businessId = null;
  else if (params.businessId) where.businessId = params.businessId;
  if (params.status) where.status = params.status as Prisma.IdeaWhereInput["status"];

  const [ideas, businesses] = await Promise.all([
    prisma.idea.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { business: true },
    }),
    prisma.business.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Topbar title="Ideias" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <QuickCaptureForm businesses={businesses} />

        <IdeaFilters businesses={businesses} />

        {ideas.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nenhuma ideia encontrada.
          </p>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {ideas.map((idea) => (
              <Card key={idea.id} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-text-primary">
                  {idea.title}
                </p>
                {idea.description && (
                  <p className="text-xs text-text-secondary">
                    {idea.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  {idea.business ? (
                    <BusinessBadge business={idea.business} />
                  ) : (
                    <span />
                  )}
                  <IdeaStatusToggle ideaId={idea.id} initialStatus={idea.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
