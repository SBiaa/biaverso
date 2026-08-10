import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
} from "@/lib/ace";
import { buildBusinessTabs, resolveTab } from "@/lib/business-modules";
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

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({
      where: { businessLinks: { some: { businessId: id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, clientId: true, createdAt: true },
    }),
  ]);

  const projectOptions = projects.map((p) => ({
    id: p.id,
    name: p.name,
    clientId: p.clientId,
    createdAt: p.createdAt.toISOString(),
  }));

  let content = null;

  if (tab === "clientes") {
    const overview = await getClientsOverview(id, sp.status);
    content = <ClientesTab businessId={id} clients={overview} />;
  } else if (tab === "interno") {
    const [internalProjects, loosePosts, looseTasks] = await Promise.all([
      prisma.project.findMany({
        where: { businessId: id, isInternal: true },
        include: {
          contentPosts: { orderBy: { publishDate: "asc" } },
          productionTasks: { orderBy: { dueDate: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contentPost.findMany({
        where: { businessId: id, clientId: null, projectId: null },
        orderBy: { publishDate: "asc" },
      }),
      prisma.productionTask.findMany({
        where: { businessId: id, clientId: null, projectId: null },
        orderBy: { dueDate: "asc" },
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

    content = (
      <ProjectsSection
        businessId={id}
        projects={projectsWithItems}
        clients={clients}
        projectOptions={projectOptions}
        loosePosts={loosePosts.map(toPostRecord)}
        looseTasks={looseTasks.map(toTaskRecord)}
      />
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
            include: { client: true },
          }),
      sp.itemType === "post"
        ? Promise.resolve([])
        : prisma.productionTask.findMany({
            where: {
              businessId: id,
              clientId: clientFilter,
              dueDate: { gte: start, lt: end },
            },
            include: { client: true },
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
        include: { client: true },
      }),
      prisma.productionTask.findMany({
        where: { businessId: id, clientId: clientFilter },
        include: { client: true },
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
