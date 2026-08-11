import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, BusinessBadge } from "@/components/ui";
import { ProjectDocumentation } from "@/components/modules/projetos/ProjectDocumentation";
import { ProjectDocuments } from "@/components/modules/projetos/ProjectDocuments";
import { CredentialsPanel } from "@/components/modules/senhas/CredentialsPanel";
import { ProjectPriceTable } from "@/components/modules/projetos/ProjectPriceTable";
import { ProjectItems } from "@/components/modules/projetos/ProjectItems";
import {
  postRecordSelect,
  taskRecordSelect,
  toPostRecord,
  toTaskRecord,
} from "@/lib/ace";
import { projectStatusColors } from "@/lib/projects-shared";
import { projectStatusLabels } from "@/lib/labels";
import { formatDateBR, hexToRgba } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id: businessId, projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      isInternal: true,
      content: true,
      businessId: true,
      business: { select: { name: true, color: true } },
      client: { select: { id: true, name: true } },
      contentPosts: { orderBy: { publishDate: "asc" }, select: postRecordSelect },
      productionTasks: { orderBy: { dueDate: "asc" }, select: taskRecordSelect },
      documents: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, url: true, type: true, notes: true },
      },
      priceTable: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, description: true, price: true, unit: true },
      },
      credentials: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          passwordEntry: {
            select: {
              id: true,
              name: true,
              login: true,
              password: true,
              url: true,
              category: true,
            },
          },
        },
      },
    },
  });

  // Um projectId de outro negócio na URL não abre a tela — senão dava para
  // espiar projeto alheio trocando só o id do meio.
  if (!project || project.businessId !== businessId) notFound();

  const [allClients, businessProjects, passwordOptions] = await Promise.all([
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
    prisma.passwordEntry.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true },
    }),
  ]);

  const clients = allClients.map((c) => ({
    id: c.id,
    name: c.name,
    linked: c.businessLinks.length > 0,
  }));

  const projectOptions = businessProjects.map((p) => ({
    id: p.id,
    name: p.name,
    clientId: p.clientId,
    createdAt: p.createdAt.toISOString(),
  }));

  const statusColor = projectStatusColors[project.status] ?? "#6B7280";

  return (
    <>
      <Topbar title={project.name} />
      <main className="flex-1 space-y-4 p-4 md:max-w-4xl md:p-6">
        <Link
          href={`/negocios/${businessId}?tab=interno`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={15} />
          Voltar para {project.business.name}
        </Link>

        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{project.name}</h2>
              {project.description && (
                <p className="mt-1 text-sm text-text-secondary">{project.description}</p>
              )}
            </div>
            <span
              className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: hexToRgba(statusColor, 0.12),
                color: statusColor,
              }}
            >
              {projectStatusLabels[project.status] ?? project.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-secondary">
            <BusinessBadge business={project.business} />
            <span>
              Cliente:{" "}
              {project.client ? (
                <Link
                  href={`/negocios/${businessId}/clientes/${project.client.id}`}
                  className="font-medium text-accent hover:underline"
                >
                  {project.client.name}
                </Link>
              ) : (
                <span className="text-text-primary">Projeto interno</span>
              )}
            </span>
            <span>
              Início:{" "}
              <span className="text-text-primary">
                {project.startDate ? formatDateBR(project.startDate) : "—"}
              </span>
            </span>
            <span>
              Fim:{" "}
              <span className="text-text-primary">
                {project.endDate ? formatDateBR(project.endDate) : "—"}
              </span>
            </span>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Documentação</h2>
          <ProjectDocumentation projectId={project.id} initialContent={project.content} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Tarefas</h2>
          <ProjectItems
            businessId={businessId}
            projectId={project.id}
            clientId={project.client?.id ?? null}
            posts={project.contentPosts.map(toPostRecord)}
            tasks={project.productionTasks.map(toTaskRecord)}
            clients={clients}
            projectOptions={projectOptions}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Documentos</h2>
          <ProjectDocuments projectId={project.id} initialDocuments={project.documents} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Credenciais</h2>
          <CredentialsPanel
            endpoint={`/api/projects/${project.id}/credentials`}
            initialCredentials={project.credentials}
            passwordOptions={passwordOptions}
            emptyLabel="Nenhuma credencial vinculada a este projeto."
            unlinkLabel="Desvincular do projeto"
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Tabela de preços</h2>
          <ProjectPriceTable projectId={project.id} initialItems={project.priceTable} />
        </Card>
      </main>
    </>
  );
}
