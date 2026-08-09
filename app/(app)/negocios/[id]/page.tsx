import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, BusinessBadge } from "@/components/ui";
import { ClientStatusFilter } from "@/components/modules/negocios/ClientStatusFilter";
import { AddClientForm } from "@/components/modules/negocios/AddClientForm";
import { ProjectList } from "@/components/modules/negocios/ProjectList";
import { getInitials } from "@/lib/utils";
import { clientStatusLabels } from "@/lib/labels";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

export default async function BusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { status } = await searchParams;

  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) notFound();

  const projects = await prisma.project.findMany({
    where: { businessId: id },
    include: { tasks: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  const clients = await prisma.client.findMany({
    where: {
      businessLinks: {
        some: {
          businessId: id,
          ...(status
            ? { status: status as Prisma.ClientBusinessWhereInput["status"] }
            : {}),
        },
      },
    },
    include: { businessLinks: { include: { business: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Topbar title={business.name} />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-text-primary">Projetos</h2>
          <ProjectList
            businessId={business.id}
            projects={projects.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              status: p.status,
              startDate: p.startDate ? p.startDate.toISOString() : null,
              endDate: p.endDate ? p.endDate.toISOString() : null,
              tasks: p.tasks.map((t) => ({
                id: t.id,
                title: t.title,
                done: t.done,
                dueDate: t.dueDate ? t.dueDate.toISOString() : null,
              })),
            }))}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-text-primary">Clientes</h2>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ClientStatusFilter />
          </div>

          <AddClientForm businessId={business.id} />

          {clients.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhum cliente encontrado.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {clients.map((client) => {
                const link = client.businessLinks.find(
                  (b) => b.businessId === business.id,
                );
                return (
                  <Link key={client.id} href={`/clientes/${client.id}`}>
                    <Card className="flex items-center justify-between transition-colors hover:bg-black/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                          {getInitials(client.name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {client.name}
                          </p>
                          <div className="mt-1 flex gap-1">
                            {client.businessLinks.map((b) => (
                              <BusinessBadge key={b.id} business={b.business} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-text-secondary">
                        {link ? clientStatusLabels[link.status] : ""}
                      </span>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
