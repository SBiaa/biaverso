import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessBadge, Card, CardTitle } from "@/components/ui";
import { ClientAvatar } from "@/components/modules/clientes/ClientAvatar";
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

  const link = client.businessLinks.find((l) => l.businessId === businessId);
  if (!link) notFound();
  const businessName = link.business.name;

  const [projects, businessClients, businessProjects, monthlyHistory, pending] = await Promise.all([
    prisma.project.findMany({
      where: { businessId, clientId },
      include: {
        contentPosts: { orderBy: { publishDate: "asc" } },
        productionTasks: {
          orderBy: { dueDate: "asc" },
          include: { subtasks: { orderBy: { order: "asc" } } },
        },
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
      <Topbar
        width="wide"
        title={client.name}
        trail={[
          { label: "Negócios", href: "/negocios" },
          { label: businessName, href: `/negocios/${businessId}` },
        ]}
      />
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-5 md:px-8 md:py-8">
        <div className="grid items-start gap-4 xl:grid-cols-[22rem_minmax(0,1fr)] xl:gap-6">
          <div className="flex min-w-0 flex-col gap-4 md:gap-6">
            <Card className="flex items-center gap-4">
              <ClientAvatar client={client} size="lg" />
              <div className="min-w-0">
                <p className="text-lg font-semibold text-text-primary">{client.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {client.businessLinks.map((link) => (
                    <BusinessBadge key={link.id} business={link.business} />
                  ))}
                </div>
              </div>
            </Card>

            <Card className="flex flex-col gap-2">
              <CardTitle>Contato</CardTitle>
              <p className="text-sm text-text-secondary">E-mail: {client.email ?? "—"}</p>
              <p className="text-sm text-text-secondary">Telefone: {client.phone ?? "—"}</p>
              <p className="text-sm text-text-secondary">Instagram: {client.instagram ?? "—"}</p>
            </Card>

            <PendingItemsSection items={pending} />
          </div>

          <div className="flex min-w-0 flex-col gap-4 md:gap-6">
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
          </div>
        </div>
      </main>
    </>
  );
}
