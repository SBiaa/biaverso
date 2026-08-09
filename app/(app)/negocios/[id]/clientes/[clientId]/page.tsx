import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, BusinessBadge } from "@/components/ui";
import { getInitials } from "@/lib/utils";
import { getMonthlyHistory, getPendingItems } from "@/lib/ace";
import { ClientProjectsSection, type ProjectWithItems } from "@/components/modules/ace/ClientProjectsSection";
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
    prisma.client.findMany({
      where: { businessLinks: { some: { businessId } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
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
    posts: p.contentPosts.map((post) => ({
      id: post.id,
      title: post.title,
      type: post.type,
      network: post.network,
      status: post.status,
      publishDate: post.publishDate ? post.publishDate.toISOString() : null,
      completedAt: post.completedAt ? post.completedAt.toISOString() : null,
      caption: post.caption,
      notes: post.notes,
      clientId: post.clientId,
      projectId: post.projectId,
    })),
    tasks: p.productionTasks.map((task) => ({
      id: task.id,
      title: task.title,
      type: task.type,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      notes: task.notes,
      clientId: task.clientId,
      projectId: task.projectId,
    })),
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

        <ClientProjectsSection
          businessId={businessId}
          clientId={clientId}
          projects={projectsWithItems}
          clients={businessClients}
          projectOptions={projectOptions}
        />

        <MonthlyHistorySection months={monthlyHistory} />

        <PendingItemsSection items={pending} />
      </main>
    </>
  );
}
