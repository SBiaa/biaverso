import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui";
import { NewClientForm } from "@/components/modules/clientes/NewClientForm";
import { ClientFilterBar } from "@/components/modules/clientes/ClientFilterBar";
import { ClientsTable, type ClientRow } from "@/components/modules/clientes/ClientsTable";
import { prospectOpenStages } from "@/lib/labels";
import { todayUtc } from "@/lib/utils";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  businessId?: string;
  kind?: string;
  stage?: string;
  niche?: string;
  due?: string;
}>;

/** Valor do select para "clientes que ainda não estão em negócio nenhum". */
const NO_BUSINESS = "__none__";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim();
  const today = todayUtc();

  const where: Prisma.ClientWhereInput = {};

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { niche: { contains: query, mode: "insensitive" } },
      { instagram: { contains: query, mode: "insensitive" } },
    ];
  }
  if (sp.niche) where.niche = sp.niche;

  if (sp.businessId === NO_BUSINESS) {
    where.businessLinks = { none: {} };
  } else {
    const linkWhere: Prisma.ClientBusinessWhereInput = {};
    if (sp.businessId) linkWhere.businessId = sp.businessId;
    if (sp.kind === "prospect" || sp.stage || sp.due === "overdue") {
      linkWhere.status = "PROSPECT";
    } else if (sp.kind === "cliente") {
      linkWhere.status = "ATIVO";
    }
    const stage = prospectOpenStages.find((s) => s === sp.stage);
    if (stage) linkWhere.prospectStage = stage;
    if (sp.due === "overdue") linkWhere.nextFollowUpAt = { lt: today };
    if (Object.keys(linkWhere).length > 0) where.businessLinks = { some: linkWhere };
  }

  const [clients, businesses, niches, totalClients, openProspects, overdueFollowUps] =
    await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          color: true,
          niche: true,
          email: true,
          phone: true,
          instagram: true,
          businessLinks: {
            orderBy: { joinedAt: "asc" },
            select: {
              id: true,
              status: true,
              prospectStage: true,
              source: true,
              lastContactAt: true,
              nextFollowUpAt: true,
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
      prisma.client.findMany({
        where: { niche: { not: null } },
        distinct: ["niche"],
        orderBy: { niche: "asc" },
        select: { niche: true },
      }),
      prisma.client.count(),
      prisma.clientBusiness.count({ where: { status: "PROSPECT" } }),
      prisma.clientBusiness.count({
        where: { status: "PROSPECT", nextFollowUpAt: { lt: today } },
      }),
    ]);

  // Quem atende mais de um negócio é o caso que motivou esta tela.
  const sharedCount = clients.filter((c) => c.businessLinks.length > 1).length;

  const rows: (ClientRow & { rank: number })[] = clients.map((client) => {
    const open = client.businessLinks.filter((l) => l.status === "PROSPECT");
    const contacts = open.flatMap((l) => (l.lastContactAt ? [l.lastContactAt.getTime()] : []));
    const followUps = open.flatMap((l) => (l.nextFollowUpAt ? [l.nextFollowUpAt.getTime()] : []));
    const nextFollowUp = followUps.length ? Math.min(...followUps) : null;
    const overdue = nextFollowUp !== null && nextFollowUp < today.getTime();

    return {
      id: client.id,
      name: client.name,
      color: client.color,
      niche: client.niche,
      contact: [client.email, client.phone, client.instagram].filter(Boolean).join(" · "),
      links: client.businessLinks.map((l) => ({
        id: l.id,
        status: l.status,
        stage: l.prospectStage,
        business: l.business,
      })),
      source: open.find((l) => l.source)?.source ?? null,
      lastContactAt: contacts.length ? new Date(Math.max(...contacts)).toISOString() : null,
      nextFollowUpAt: nextFollowUp !== null ? new Date(nextFollowUp).toISOString() : null,
      followUpOverdue: overdue,
      prospectLinks: open.map((l) => ({ id: l.id, stage: l.prospectStage })),
      // O que pede ação sobe: follow-up atrasado, depois prospects, depois o resto.
      rank: overdue ? 0 : open.length > 0 ? 1 : 2,
    };
  });
  // O sort é estável: dentro de cada grupo continua a ordem por nome.
  rows.sort((a, b) => a.rank - b.rank);

  const filtered = Boolean(
    query || sp.businessId || sp.kind || sp.stage || sp.niche || sp.due,
  );

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
          <ClientFilterBar
            businesses={businesses}
            niches={niches.flatMap((n) => (n.niche ? [n.niche] : []))}
          />
          <NewClientForm businesses={businesses} />
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {filtered
              ? "Nenhum cliente encontrado com esses filtros."
              : "Nenhum cliente cadastrado ainda."}
          </p>
        ) : (
          <ClientsTable rows={rows} />
        )}
      </main>
    </>
  );
}
