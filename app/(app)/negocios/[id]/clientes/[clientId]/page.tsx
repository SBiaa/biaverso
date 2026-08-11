import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, BusinessBadge } from "@/components/ui";
import { getInitials } from "@/lib/utils";
import { getMonthlyHistory, getPendingItems, toPostRecord, toTaskRecord } from "@/lib/ace";
import { ProjectsSection, type ProjectWithItems } from "@/components/modules/ace/ProjectsSection";
import { MonthlyHistorySection } from "@/components/modules/ace/MonthlyHistorySection";
import { PendingItemsSection } from "@/components/modules/ace/PendingItemsSection";

export const dynamic = "force-dynamic";

export default async function AceClientProfilePage({
  params,
}: {
  params: Promise<{ id: string; clientId: string }>;
}) {
  const { id: businessId, clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { businessLinks: { include: { business: true } } },
  });
  if (!client) notFound();

  const isLinkedToBusiness = client.businessLinks.some((link) => link.businessId === businessId);
  if (!isLinkedToBusiness) notFound();

  const [projects, businessClients, businessProjects, monthlyHistory, pending] = await Promise.all([
    prisma.project.findMany({
      where: { businessId, clientId },
      include: {
        contentPosts: { orderBy: { publishDate: "asc" } },
        productionTasks: { orderBy: { dueDate: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Todos os clientes, com a marca de quem já é deste negócio — mesma regra
    // do select da página do negócio.
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        businessLinks: { where: { businessId }, select: { id: true } },
      },
    }),
    prisma.project.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, clientId: true, createdAt: true },
    }),
    getMonthlyHistory(clientId, businessId),
    getPendingItems(clientId, businessId),
  ]);

  const projectsWithItems: ProjectWithItems[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    endDate: p.endDate ? p.endDate.toISOString() : null,
    posts: p.contentPosts.map(toPostRecord),
    tasks: p.productionTasks.map(toTaskRecord),
  }));

  const projectOptions = businessProjects.map((p) => ({
    id: p.id,
    name: p.name,
    clientId: p.clientId,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <>
      <Topbar title={client.name} />
      <main className="flex-1 space-y-4 p-4 md:max-w-3xl md:p-6">
        <Card className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-lg font-semibold text-accent">
            {getInitials(client.name)}
          </div>
          <div>
            <p className="text-lg font-semibold text-text-primary">{client.name}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {client.businessLinks.map((link) => (
                <BusinessBadge key={link.id} business={link.business} />
              ))}
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Contato</h2>
          <p className="text-sm text-text-secondary">E-mail: {client.email ?? "—"}</p>
          <p className="text-sm text-text-secondary">Telefone: {client.phone ?? "—"}</p>
          <p className="text-sm text-text-secondary">Instagram: {client.instagram ?? "—"}</p>
        </Card>

        <ProjectsSection
          businessId={businessId}
          clientId={clientId}
          projects={projectsWithItems}
          clients={businessClients.map((c) => ({
            id: c.id,
            name: c.name,
            linked: c.businessLinks.length > 0,
          }))}
          projectOptions={projectOptions}
        />

        <MonthlyHistorySection months={monthlyHistory} />

        <PendingItemsSection items={pending} />
      </main>
    </>
  );
}
