import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessBadge, Card, CardTitle } from "@/components/ui";
import { ClientContactForm } from "@/components/modules/clientes/ClientContactForm";
import { ClientBusinessLinks } from "@/components/modules/clientes/ClientBusinessLinks";
import {
  ClientBusinessSummary,
  type BusinessSummary,
} from "@/components/modules/clientes/ClientBusinessSummary";
import { getPendingItems } from "@/lib/ace";
import { ProspectPanel } from "@/components/modules/clientes/ProspectPanel";
import { ClientAvatar } from "@/components/modules/clientes/ClientAvatar";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, allBusinesses] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        color: true,
        photo: true,
        email: true,
        phone: true,
        instagram: true,
        niche: true,
        notes: true,
        businessLinks: {
          orderBy: { joinedAt: "asc" },
          select: {
            id: true,
            businessId: true,
            status: true,
            joinedAt: true,
            prospectStage: true,
            nextFollowUpAt: true,
            lastContactAt: true,
            proposalValue: true,
            source: true,
            business: { select: { id: true, name: true, color: true } },
            prospectTasks: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                done: true,
                dueDate: true,
                completedAt: true,
              },
            },
            prospectNotes: {
              orderBy: { createdAt: "desc" },
              take: 100,
              select: { id: true, text: true, kind: true, createdAt: true },
            },
          },
        },
      },
    }),
    prisma.business.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!client) notFound();

  // Com algum negócio vinculado a página ganha a coluna da direita (prospecção
  // e resumo); sem nenhum, continua a página estreita de cadastro.
  const hasProspect = client.businessLinks.length > 0;

  const summaries: BusinessSummary[] = await Promise.all(
    client.businessLinks
      .filter((link) => link.status !== "PROSPECT")
      .map(async (link) => {
        const [projects, pending] = await Promise.all([
          prisma.project.findMany({
            where: { businessId: link.businessId, clientId: client.id, status: "EM_ANDAMENTO" },
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true, status: true, endDate: true },
          }),
          getPendingItems(client.id, link.businessId),
        ]);
        return {
          businessId: link.businessId,
          clientId: client.id,
          status: link.status,
          business: link.business,
          projects: projects.map((p) => ({
            ...p,
            endDate: p.endDate ? p.endDate.toISOString() : null,
          })),
          pending,
        };
      }),
  );

  return (
    <>
      <Topbar
        width={hasProspect ? "wide" : "narrow"}
        title={client.name}
        trail={[{ label: "Clientes", href: "/clientes" }]}
      />
      <main
        className={cn(
          "mx-auto w-full flex-1 space-y-4 px-4 py-5 md:space-y-6 md:px-8 md:py-8",
          hasProspect ? "max-w-[1800px]" : "max-w-3xl",
        )}
      >
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={15} />
          Todos os clientes
        </Link>

        <div
          className={cn(
            hasProspect &&
              "grid items-start gap-4 xl:grid-cols-[22rem_minmax(0,1fr)] xl:gap-6",
          )}
        >
          <div className="flex min-w-0 flex-col gap-4 md:gap-6">
            <Card className="flex items-center gap-4">
              <ClientAvatar client={client} size="lg" />
              <div className="min-w-0">
                <p className="text-lg font-semibold text-text-primary">
                  {client.name}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {client.businessLinks.length === 0 ? (
                    <span className="text-xs text-text-secondary">
                      Sem negócio vinculado
                    </span>
                  ) : (
                    client.businessLinks.map((link) => (
                      <BusinessBadge
                        key={link.id}
                        business={link.business}
                        className={
                          link.status === "ATIVO" ? undefined : "opacity-50"
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <ClientContactForm client={client} />
            </Card>

            <Card className="flex flex-col gap-3">
              <CardTitle>Negócios</CardTitle>
              <ClientBusinessLinks
                clientId={client.id}
                links={client.businessLinks.map((link) => ({
                  id: link.id,
                  businessId: link.businessId,
                  status: link.status,
                  joinedAt: link.joinedAt.toISOString(),
                  prospectStage: link.prospectStage,
                  nextFollowUpAt: link.nextFollowUpAt
                    ? link.nextFollowUpAt.toISOString()
                    : null,
                  source: link.source,
                  business: link.business,
                }))}
                allBusinesses={allBusinesses}
              />
            </Card>

            {client.businessLinks.length > 0 && (
              <Card className="flex flex-col gap-3">
                <CardTitle>Ver dentro do negócio</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {client.businessLinks.map((link) => (
                    <Link
                      key={link.id}
                      href={`/negocios/${link.businessId}/clientes/${client.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-hover"
                    >
                      {link.business.name}
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>
          {hasProspect && (
            <div className="flex min-w-0 flex-col gap-4 md:gap-6">
              {client.businessLinks
                .filter((link) => link.status === "PROSPECT")
                .map((link) => (
                  <ProspectPanel
                    key={link.id}
                    link={{
                      id: link.id,
                      stage: link.prospectStage,
                      source: link.source,
                      lastContactAt: link.lastContactAt
                        ? link.lastContactAt.toISOString()
                        : null,
                      nextFollowUpAt: link.nextFollowUpAt
                        ? link.nextFollowUpAt.toISOString()
                        : null,
                      proposalValue: link.proposalValue,
                      business: link.business,
                      steps: link.prospectTasks.map((t) => ({
                        id: t.id,
                        title: t.title,
                        done: t.done,
                        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                        completedAt: t.completedAt
                          ? t.completedAt.toISOString()
                          : null,
                      })),
                      notes: link.prospectNotes.map((n) => ({
                        id: n.id,
                        text: n.text,
                        kind: n.kind,
                        createdAt: n.createdAt.toISOString(),
                      })),
                    }}
                  />
                ))}
              {summaries.map((summary) => (
                <ClientBusinessSummary key={summary.businessId} summary={summary} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
