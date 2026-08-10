import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessTabs } from "@/components/modules/negocios/BusinessTabs";
import { ClientesTab } from "@/components/modules/negocios/ClientesTab";
import { AceFilterBar } from "@/components/modules/ace/AceFilterBar";
import { CalendarBoard, type CalendarItem } from "@/components/modules/ace/CalendarBoard";
import { KanbanBoard, type KanbanItem } from "@/components/modules/ace/KanbanBoard";
import { MonthPicker } from "@/components/ui";
import {
  getClientsOverview,
  getKanbanColumn,
  isPostOverdue,
  isTaskOverdue,
  contentStatusColors,
  productionStatusColors,
} from "@/lib/ace";
import { contentStatusLabels, productionStatusLabels, postTypeLabels, productionTypeLabels } from "@/lib/labels";
import { todayUtc, getMonthRange, parseIntParam } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  status?: string;
  clientId?: string;
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
  const tab = sp.tab === "calendario" || sp.tab === "kanban" ? sp.tab : "clientes";

  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) notFound();

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

  let clientesContent = null;
  let calendarContent = null;
  let kanbanContent = null;

  if (tab === "clientes") {
    const overview = await getClientsOverview(id, sp.status);
    clientesContent = <ClientesTab businessId={id} clients={overview} />;
  } else if (tab === "calendario") {
    const today = todayUtc();
    const month = parseIntParam(sp.month, 1, 12) ?? today.getUTCMonth() + 1;
    const year = parseIntParam(sp.year, 1970, 2999) ?? today.getUTCFullYear();
    const { start, end } = getMonthRange(new Date(Date.UTC(year, month - 1, 1)));

    const [posts, tasks] = await Promise.all([
      sp.itemType === "task"
        ? Promise.resolve([])
        : prisma.contentPost.findMany({
            where: {
              businessId: id,
              clientId: sp.clientId || undefined,
              publishDate: { gte: start, lt: end },
            },
            include: { client: true },
          }),
      sp.itemType === "post"
        ? Promise.resolve([])
        : prisma.productionTask.findMany({
            where: {
              businessId: id,
              clientId: sp.clientId || undefined,
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
          clientName: p.client.name,
          overdue: isPostOverdue(p),
          record: {
            id: p.id,
            title: p.title,
            type: p.type,
            network: p.network,
            status: p.status,
            publishDate: p.publishDate ? p.publishDate.toISOString() : null,
            completedAt: p.completedAt ? p.completedAt.toISOString() : null,
            caption: p.caption,
            notes: p.notes,
            clientId: p.clientId,
            projectId: p.projectId,
          },
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
          clientName: t.client.name,
          overdue: isTaskOverdue(t),
          record: {
            id: t.id,
            title: t.title,
            type: t.type,
            description: t.description,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
            completedAt: t.completedAt ? t.completedAt.toISOString() : null,
            notes: t.notes,
            clientId: t.clientId,
            projectId: t.projectId,
          },
        })),
    ];

    calendarContent = (
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
    const [posts, tasks] = await Promise.all([
      prisma.contentPost.findMany({
        where: { businessId: id, clientId: sp.clientId || undefined },
        include: { client: true },
      }),
      prisma.productionTask.findMany({
        where: { businessId: id, clientId: sp.clientId || undefined },
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
          clientName: p.client.name,
          date: p.publishDate ? p.publishDate.toISOString() : null,
          overdue: isPostOverdue(p),
          column,
          record: {
            id: p.id,
            title: p.title,
            type: p.type,
            network: p.network,
            status: p.status,
            publishDate: p.publishDate ? p.publishDate.toISOString() : null,
            completedAt: p.completedAt ? p.completedAt.toISOString() : null,
            caption: p.caption,
            notes: p.notes,
            clientId: p.clientId,
            projectId: p.projectId,
          },
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
          clientName: t.client.name,
          date: t.dueDate ? t.dueDate.toISOString() : null,
          overdue: isTaskOverdue(t),
          column,
          record: {
            id: t.id,
            title: t.title,
            type: t.type,
            description: t.description,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
            completedAt: t.completedAt ? t.completedAt.toISOString() : null,
            notes: t.notes,
            clientId: t.clientId,
            projectId: t.projectId,
          },
        }];
      }),
    ];

    kanbanContent = (
      <div className="flex flex-col gap-4">
        <AceFilterBar clients={clients} showType={false} showStatus={false} />
        <KanbanBoard businessId={id} items={items} clients={clients} projects={projectOptions} />
      </div>
    );
  }

  return (
    <>
      <Topbar title={business.name} />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <BusinessTabs active={tab} />
        {tab === "clientes" && clientesContent}
        {tab === "calendario" && calendarContent}
        {tab === "kanban" && kanbanContent}
      </main>
    </>
  );
}
