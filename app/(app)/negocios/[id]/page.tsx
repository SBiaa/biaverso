import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { decryptCredentialLinks } from "@/lib/passwords";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessTabs } from "@/components/modules/negocios/BusinessTabs";
import { ClientesTab } from "@/components/modules/negocios/ClientesTab";
import { AceFilterBar } from "@/components/modules/ace/AceFilterBar";
import { CalendarBoard, type CalendarItem } from "@/components/modules/ace/CalendarBoard";
import { KanbanBoard, type KanbanItem } from "@/components/modules/ace/KanbanBoard";
import { ProjectsSection, type ProjectWithItems } from "@/components/modules/ace/ProjectsSection";
import { Card, MonthPicker, StatCard } from "@/components/ui";
import {
  getClientsOverview,
  getKanbanColumn,
  isPostOverdue,
  isTaskOverdue,
  scopeClientFilter,
  toPostRecord,
  toTaskRecord,
  contentStatusColors,
  productionStatusColors,
  postRecordSelect,
  taskRecordSelect,
  postWithClientSelect,
  taskWithClientSelect,
} from "@/lib/ace";
import { buildBusinessTabs, resolveTab, OVERVIEW_TAB } from "@/lib/business-modules";
import { BusinessOverviewTab } from "@/components/modules/negocios/BusinessOverviewTab";
import { getBusinessOverview } from "@/lib/business-overview";
import { CredentialsPanel } from "@/components/modules/senhas/CredentialsPanel";
import { ProjectGrid } from "@/components/modules/projetos/ProjectGrid";
import { ProjectFilterBar } from "@/components/modules/projetos/ProjectFilterBar";
import { getProjectsOverview } from "@/lib/projects";
import { projectSortOptions, type ProjectSort } from "@/lib/projects-shared";
import {
  contentStatusLabels,
  productionStatusLabels,
  postTypeLabels,
  productionTypeLabels,
  transactionCategoryLabels,
} from "@/lib/labels";
import {
  formatCurrencyBRL,
  formatDateBR,
  todayUtc,
  getMonthRange,
  parseIntParam,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  status?: string;
  clientId?: string;
  scope?: string;
  itemType?: string;
  itemStatus?: string;
  month?: string;
  year?: string;
  sort?: string;
}>;

export default async function BusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const business = await prisma.business.findUnique({
    where: { id },
    include: { modules: { orderBy: { order: "asc" } } },
  });
  if (!business) notFound();

  const tabs = buildBusinessTabs(id, business.modules);
  const tab = resolveTab(tabs, sp.tab);

  const [allClients, projects] = await Promise.all([
    // Todos os clientes, não só os deste negócio: a mesma pessoa costuma ser
    // cliente de mais de um. O select separa em dois grupos com a flag abaixo,
    // e escolher alguém sem vínculo faz a API criar o vínculo.
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        businessLinks: { where: { businessId: id }, select: { id: true } },
      },
    }),
    prisma.project.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, clientId: true, createdAt: true },
    }),
  ]);

  const clients = allClients.map((c) => ({
    id: c.id,
    name: c.name,
    linked: c.businessLinks.length > 0,
  }));

  const projectOptions = projects.map((p) => ({
    id: p.id,
    name: p.name,
    clientId: p.clientId,
    createdAt: p.createdAt.toISOString(),
  }));

  let content = null;

  if (tab === OVERVIEW_TAB) {
    const activeModules = business.modules
      .filter((m) => m.active)
      .map((m) => m.module);

    const [overview, { projects: projectCards }] = await Promise.all([
      getBusinessOverview(id, activeModules),
      getProjectsOverview(id),
    ]);

    content = (
      <BusinessOverviewTab
        businessId={id}
        overview={overview}
        // Só os que estão rolando — concluído e cancelado enchem a home.
        projects={projectCards.filter((p) => p.status === "EM_ANDAMENTO")}
        tabs={tabs.filter((t) => t.key !== OVERVIEW_TAB)}
      />
    );
  } else if (tab === "clientes") {
    const overview = await getClientsOverview(id, sp.status);
    content = <ClientesTab businessId={id} clients={overview} />;
  } else if (tab === "interno") {
    const [internalProjects, loosePosts, looseTasks] = await Promise.all([
      prisma.project.findMany({
        where: { businessId: id, isInternal: true },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
          contentPosts: {
            orderBy: { publishDate: "asc" },
            select: postRecordSelect,
          },
          productionTasks: {
            orderBy: { dueDate: "asc" },
            select: taskRecordSelect,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contentPost.findMany({
        where: { businessId: id, clientId: null, projectId: null },
        orderBy: { publishDate: "asc" },
        select: postRecordSelect,
      }),
      prisma.productionTask.findMany({
        where: { businessId: id, clientId: null, projectId: null },
        orderBy: { dueDate: "asc" },
        select: taskRecordSelect,
      }),
    ]);

    const projectsWithItems: ProjectWithItems[] = internalProjects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      startDate: p.startDate ? p.startDate.toISOString() : null,
      endDate: p.endDate ? p.endDate.toISOString() : null,
      posts: p.contentPosts.map(toPostRecord),
      tasks: p.productionTasks.map(toTaskRecord),
    }));

    // Mesmo grid da página /projetos, já filtrado neste negócio — inclui os
    // projetos de cliente, que a seção abaixo (só internos) não mostra.
    const { projects: projectCards } = await getProjectsOverview(id);
    const sort: ProjectSort = projectSortOptions.includes(sp.sort as ProjectSort)
      ? (sp.sort as ProjectSort)
      : "prazo";
    const visibleCards = projectCards.filter((p) => {
      if (sp.status && p.status !== sp.status) return false;
      if (sp.scope === "interno" && !p.isInternal) return false;
      if (sp.scope === "cliente" && p.isInternal) return false;
      return true;
    });

    content = (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Todos os projetos deste negócio
          </h2>
          <ProjectFilterBar businesses={[]} showBusiness={false} />
          <ProjectGrid projects={visibleCards} sort={sort} showBusinessGroups={false} />
        </div>

        <ProjectsSection
          businessId={id}
          projects={projectsWithItems}
          clients={clients}
          projectOptions={projectOptions}
          loosePosts={loosePosts.map(toPostRecord)}
          looseTasks={looseTasks.map(toTaskRecord)}
        />
      </div>
    );
  } else if (tab === "calendario") {
    const today = todayUtc();
    const month = parseIntParam(sp.month, 1, 12) ?? today.getUTCMonth() + 1;
    const year = parseIntParam(sp.year, 1970, 2999) ?? today.getUTCFullYear();
    const { start, end } = getMonthRange(new Date(Date.UTC(year, month - 1, 1)));
    const clientFilter = sp.clientId || scopeClientFilter(sp.scope);

    const [posts, tasks] = await Promise.all([
      sp.itemType === "task"
        ? Promise.resolve([])
        : prisma.contentPost.findMany({
            where: {
              businessId: id,
              clientId: clientFilter,
              publishDate: { gte: start, lt: end },
            },
            select: postWithClientSelect,
          }),
      sp.itemType === "post"
        ? Promise.resolve([])
        : prisma.productionTask.findMany({
            where: {
              businessId: id,
              clientId: clientFilter,
              dueDate: { gte: start, lt: end },
            },
            select: taskWithClientSelect,
          }),
    ]);

    const items: CalendarItem[] = [
      ...posts
        .filter((p) => !sp.itemStatus || getKanbanColumn("post", p.status) === sp.itemStatus)
        .map((p) => ({
          id: p.id,
          kind: "post" as const,
          title: p.title,
          day: p.publishDate!.getUTCDate(),
          statusLabel: contentStatusLabels[p.status],
          statusColor: contentStatusColors[p.status],
          clientName: p.client?.name ?? null,
          overdue: isPostOverdue(p),
          record: toPostRecord(p),
        })),
      ...tasks
        .filter((t) => !sp.itemStatus || getKanbanColumn("task", t.status) === sp.itemStatus)
        .map((t) => ({
          id: t.id,
          kind: "task" as const,
          title: t.title,
          day: t.dueDate!.getUTCDate(),
          statusLabel: productionStatusLabels[t.status],
          statusColor: productionStatusColors[t.status],
          clientName: t.client?.name ?? null,
          overdue: isTaskOverdue(t),
          record: toTaskRecord(t),
        })),
    ];

    content = (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthPicker month={month} year={year} />
          <AceFilterBar clients={clients} />
        </div>
        <CalendarBoard
          businessId={id}
          month={month}
          year={year}
          items={items}
          clients={clients}
          projects={projectOptions}
        />
      </div>
    );
  } else if (tab === "kanban") {
    const clientFilter = sp.clientId || scopeClientFilter(sp.scope);

    const [posts, tasks] = await Promise.all([
      prisma.contentPost.findMany({
        where: { businessId: id, clientId: clientFilter },
        select: postWithClientSelect,
      }),
      prisma.productionTask.findMany({
        where: { businessId: id, clientId: clientFilter },
        select: taskWithClientSelect,
      }),
    ]);

    const items: KanbanItem[] = [
      ...posts.flatMap((p) => {
        const column = getKanbanColumn("post", p.status);
        if (!column) return [];
        return [{
          id: p.id,
          kind: "post" as const,
          title: p.title,
          typeLabel: postTypeLabels[p.type],
          clientName: p.client?.name ?? null,
          date: p.publishDate ? p.publishDate.toISOString() : null,
          overdue: isPostOverdue(p),
          column,
          record: toPostRecord(p),
        }];
      }),
      ...tasks.flatMap((t) => {
        const column = getKanbanColumn("task", t.status);
        if (!column) return [];
        return [{
          id: t.id,
          kind: "task" as const,
          title: t.title,
          typeLabel: productionTypeLabels[t.type],
          clientName: t.client?.name ?? null,
          date: t.dueDate ? t.dueDate.toISOString() : null,
          overdue: isTaskOverdue(t),
          column,
          record: toTaskRecord(t),
        }];
      }),
    ];

    content = (
      <div className="flex flex-col gap-4">
        <AceFilterBar clients={clients} showType={false} showStatus={false} />
        <KanbanBoard businessId={id} items={items} clients={clients} projects={projectOptions} />
      </div>
    );
  } else if (tab === "senhas") {
    const [rawCredentials, passwordOptions] = await Promise.all([
      prisma.businessCredential.findMany({
        where: { businessId: id },
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
      }),
      prisma.passwordEntry.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, category: true },
      }),
    ]);

    const credentials = decryptCredentialLinks(rawCredentials);

    content = (
      <Card className="flex flex-col gap-3">
        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-xs text-text-secondary">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>
            As senhas são as mesmas do cofre em{" "}
            <Link href="/senhas" className="font-medium underline">
              Senhas
            </Link>
            . Editar aqui altera lá também — é o mesmo registro.
          </span>
        </div>
        <CredentialsPanel
          endpoint={`/api/businesses/${id}/credentials`}
          initialCredentials={credentials}
          passwordOptions={passwordOptions}
          emptyLabel="Nenhuma credencial vinculada a este negócio."
          unlinkLabel="Desvincular do negócio"
        />
      </Card>
    );
  } else if (tab === "financeiro") {
    const { start, end } = getMonthRange(todayUtc());

    const [entradas, saidas, recent] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { businessId: id, type: "ENTRADA", date: { gte: start, lt: end } },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { businessId: id, type: "SAIDA", date: { gte: start, lt: end } },
      }),
      prisma.transaction.findMany({
        where: { businessId: id },
        orderBy: { date: "desc" },
        take: 10,
      }),
    ]);

    const totalIn = entradas._sum.amount ?? 0;
    const totalOut = saidas._sum.amount ?? 0;
    const saldo = totalIn - totalOut;

    content = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Entradas do mês" value={formatCurrencyBRL(totalIn)} />
          <StatCard label="Saídas do mês" value={formatCurrencyBRL(totalOut)} />
          <StatCard
            label="Saldo do mês"
            value={formatCurrencyBRL(saldo)}
            valueClassName={saldo >= 0 ? "text-emerald-600" : "text-red-600"}
          />
        </div>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Últimas transações</h2>
            <Link href="/financeiro/transacoes" className="text-xs font-medium text-accent">
              Ver todas
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhuma transação vinculada a este negócio.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-secondary">
                      {formatDateBR(t.date)} · {transactionCategoryLabels[t.category]}
                    </p>
                  </div>
                  <span
                    className={
                      t.type === "ENTRADA"
                        ? "font-medium text-emerald-600"
                        : "font-medium text-red-600"
                    }
                  >
                    {t.type === "ENTRADA" ? "+" : "−"}
                    {formatCurrencyBRL(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  return (
    <>
      <Topbar title={business.name} />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <BusinessTabs businessId={id} tabs={tabs} active={tab} />
        {content ?? (
          <p className="text-sm text-text-secondary">
            Nenhum módulo ligado neste negócio.{" "}
            <Link href={`/negocios/${id}/configuracoes`} className="font-medium text-accent">
              Escolher os módulos
            </Link>
            .
          </p>
        )}
      </main>
    </>
  );
}
