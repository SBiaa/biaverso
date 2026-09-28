import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, BusinessBadge, StatCard } from "@/components/ui";
import { NewClientForm } from "@/components/modules/clientes/NewClientForm";
import { ClientFilterBar } from "@/components/modules/clientes/ClientFilterBar";
import { ClientAvatar } from "@/components/modules/clientes/ClientAvatar";
import { prospectStageLabels } from "@/lib/labels";
import { todayUtc } from "@/lib/utils";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; businessId?: string; kind?: string }>;

/** Valor do select para "clientes que ainda não estão em negócio nenhum". */
const NO_BUSINESS = "__none__";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim();

  const where: Prisma.ClientWhereInput = {};

  if (query) {
    where.name = { contains: query, mode: "insensitive" };
  }

  if (sp.businessId === NO_BUSINESS) {
    where.businessLinks = { none: {} };
  } else {
    const linkWhere: Prisma.ClientBusinessWhereInput = {};
    if (sp.businessId) linkWhere.businessId = sp.businessId;
    if (sp.kind === "prospect") linkWhere.status = "PROSPECT";
    if (Object.keys(linkWhere).length > 0) where.businessLinks = { some: linkWhere };
  }

  const [clients, businesses, totalClients, openProspects, overdueFollowUps] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        email: true,
        phone: true,
        instagram: true,
        businessLinks: {
          orderBy: { joinedAt: "asc" },
          select: {
            id: true,
            status: true,
            prospectStage: true,
            business: { select: { name: true, color: true } },
          },
        },
      },
    }),
    prisma.business.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.client.count(),
    prisma.clientBusiness.count({ where: { status: "PROSPECT" } }),
    prisma.clientBusiness.count({
      where: { status: "PROSPECT", nextFollowUpAt: { lt: todayUtc() } },
    }),
  ]);

  // Quem atende mais de um negócio é o caso que motivou esta tela.
  const sharedCount = clients.filter((c) => c.businessLinks.length > 1).length;

  return (
    <>
      <Topbar title="Clientes" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Clientes cadastrados"
            value={totalClients}
            icon={<Users size={16} className="text-text-secondary" />}
          />
          <StatCard label="Em mais de um negócio" value={sharedCount} />
          <StatCard label="Mostrando" value={clients.length} />
          <StatCard label="Prospects em aberto" value={openProspects} />
          <StatCard
            label="Follow-up atrasado"
            value={overdueFollowUps}
            valueClassName={overdueFollowUps > 0 ? "text-danger" : undefined}
          />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <ClientFilterBar businesses={businesses} />
          <NewClientForm businesses={businesses} />
        </div>

        {clients.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {query || sp.businessId
              ? "Nenhum cliente encontrado com esses filtros."
              : "Nenhum cliente cadastrado ainda."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {clients.map((client) => {
              const contact = [client.email, client.phone, client.instagram]
                .filter(Boolean)
                .join(" · ");

              return (
                <Link key={client.id} href={`/clientes/${client.id}`}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:bg-hover">
                    <div className="flex min-w-0 items-center gap-3">
                      <ClientAvatar client={client} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">
                          {client.name}
                        </p>
                        <p className="truncate text-xs text-text-secondary">
                          {contact || "Sem contato cadastrado"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {client.businessLinks.length === 0 ? (
                        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-text-secondary">
                          Sem negócio
                        </span>
                      ) : (
                        client.businessLinks.map((link) => (
                          <span key={link.id} className="inline-flex items-center gap-1">
                            <BusinessBadge
                              business={link.business}
                              className={
                                link.status === "ATIVO" || link.status === "PROSPECT"
                                  ? undefined
                                  : "opacity-50"
                              }
                            />
                            {link.status === "PROSPECT" && (
                              <span className="rounded-full bg-warning-soft-bg px-2 py-0.5 text-[10px] font-medium text-warning-soft-text">
                                {prospectStageLabels[link.prospectStage ?? "NOVO_CONTATO"]}
                              </span>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
