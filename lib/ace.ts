import { prisma } from "@/lib/prisma";
import { getMonthRange, formatMonthYearBR, todayUtc } from "@/lib/utils";
import { contentStatusLabels, productionStatusLabels } from "@/lib/labels";
import {
  donePostStatuses,
  doneTaskStatuses,
  isPostOverdue,
  isTaskOverdue,
  type ClientOverview,
  type PendingItem,
  type MonthlyHistoryEntry,
} from "@/lib/ace-shared";
import type { Prisma } from "@/app/generated/prisma/client";

// Server-only: this file imports "@/lib/prisma", so it must never be imported
// from a "use client" component — see "@/lib/ace-shared" for the client-safe subset.
export * from "@/lib/ace-shared";

export async function getClientsOverview(
  businessId: string,
  statusFilter?: string,
): Promise<ClientOverview[]> {
  const clients = await prisma.client.findMany({
    where: {
      businessLinks: {
        some: {
          businessId,
          ...(statusFilter
            ? { status: statusFilter as Prisma.ClientBusinessWhereInput["status"] }
            : {}),
        },
      },
    },
    include: {
      projects: { where: { businessId } },
    },
    orderBy: { name: "asc" },
  });

  const [posts, tasks] = await Promise.all([
    prisma.contentPost.findMany({
      where: {
        businessId,
        status: { notIn: donePostStatuses },
        publishDate: { not: null },
      },
      orderBy: { publishDate: "asc" },
    }),
    prisma.productionTask.findMany({
      where: {
        businessId,
        status: { notIn: doneTaskStatuses },
        dueDate: { not: null },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return clients.map((client) => {
    const upcoming = [
      ...posts
        .filter((p) => p.clientId === client.id)
        .map((p) => ({ date: p.publishDate as Date, title: p.title, kind: "post" as const })),
      ...tasks
        .filter((t) => t.clientId === client.id)
        .map((t) => ({ date: t.dueDate as Date, title: t.title, kind: "task" as const })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    return {
      id: client.id,
      name: client.name,
      activeProjectCount: client.projects.filter((p) => p.status === "EM_ANDAMENTO").length,
      nextDelivery: upcoming
        ? { date: upcoming.date.toISOString(), title: upcoming.title, kind: upcoming.kind }
        : null,
    };
  });
}

export async function getPendingItems(
  clientId: string,
  businessId: string,
): Promise<PendingItem[]> {
  const [posts, tasks] = await Promise.all([
    prisma.contentPost.findMany({
      where: { clientId, businessId, status: { notIn: donePostStatuses } },
      include: { project: true },
    }),
    prisma.productionTask.findMany({
      where: { clientId, businessId, status: { notIn: doneTaskStatuses } },
      include: { project: true },
    }),
  ]);

  const items: PendingItem[] = [
    ...posts.map((p) => ({
      id: p.id,
      kind: "post" as const,
      title: p.title,
      statusLabel: contentStatusLabels[p.status],
      dueOrPublishDate: p.publishDate ? p.publishDate.toISOString() : null,
      overdue: isPostOverdue(p),
      projectId: p.projectId,
      projectName: p.project?.name ?? null,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      kind: "task" as const,
      title: t.title,
      statusLabel: productionStatusLabels[t.status],
      dueOrPublishDate: t.dueDate ? t.dueDate.toISOString() : null,
      overdue: isTaskOverdue(t),
      projectId: t.projectId,
      projectName: t.project?.name ?? null,
    })),
  ];

  return items.sort((a, b) => {
    if (!a.dueOrPublishDate) return 1;
    if (!b.dueOrPublishDate) return -1;
    return a.dueOrPublishDate.localeCompare(b.dueOrPublishDate);
  });
}

export async function getMonthlyHistory(
  clientId: string,
  businessId: string,
  monthsBack = 6,
): Promise<MonthlyHistoryEntry[]> {
  const [posts, tasks] = await Promise.all([
    prisma.contentPost.findMany({ where: { clientId, businessId } }),
    prisma.productionTask.findMany({ where: { clientId, businessId } }),
  ]);

  const today = todayUtc();
  const entries: MonthlyHistoryEntry[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const ref = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const { start, end } = getMonthRange(ref);

    const publishedCount = posts.filter(
      (p) =>
        p.status === "PUBLICADO" &&
        p.completedAt &&
        p.completedAt >= start &&
        p.completedAt < end,
    ).length;

    const completedCount = tasks.filter(
      (t) =>
        t.status === "CONCLUIDO" &&
        t.completedAt &&
        t.completedAt >= start &&
        t.completedAt < end,
    ).length;

    const pendingOrLate: MonthlyHistoryEntry["pendingOrLate"] = [];

    for (const p of posts) {
      const dueDate = p.publishDate;
      const stillOpenInMonth =
        dueDate && dueDate >= start && dueDate < end && !donePostStatuses.includes(p.status);
      const completedLate =
        p.completedAt && p.completedAt >= start && p.completedAt < end && dueDate && p.completedAt > dueDate;
      if (stillOpenInMonth || completedLate) {
        pendingOrLate.push({
          id: p.id,
          kind: "post",
          title: p.title,
          dueOrPublishDate: dueDate ? dueDate.toISOString() : null,
          completedAt: p.completedAt ? p.completedAt.toISOString() : null,
          late: Boolean(completedLate),
        });
      }
    }

    for (const t of tasks) {
      const dueDate = t.dueDate;
      const stillOpenInMonth =
        dueDate && dueDate >= start && dueDate < end && !doneTaskStatuses.includes(t.status);
      const completedLate =
        t.completedAt && t.completedAt >= start && t.completedAt < end && dueDate && t.completedAt > dueDate;
      if (stillOpenInMonth || completedLate) {
        pendingOrLate.push({
          id: t.id,
          kind: "task",
          title: t.title,
          dueOrPublishDate: dueDate ? dueDate.toISOString() : null,
          completedAt: t.completedAt ? t.completedAt.toISOString() : null,
          late: Boolean(completedLate),
        });
      }
    }

    entries.push({
      month: ref.getUTCMonth() + 1,
      year: ref.getUTCFullYear(),
      label: formatMonthYearBR(ref.getUTCMonth() + 1, ref.getUTCFullYear()),
      publishedCount,
      completedCount,
      pendingOrLate,
    });
  }

  return entries;
}

// Campos exatos que `toPostRecord`/`toTaskRecord` consomem. Usar estes `select`
// evita puxar a linha inteira do banco só para montar o record — e o
// `satisfies` quebra o build se algum campo do record deixar de ser buscado.
export const postRecordSelect = {
  id: true,
  title: true,
  type: true,
  network: true,
  status: true,
  publishDate: true,
  completedAt: true,
  caption: true,
  notes: true,
  clientId: true,
  projectId: true,
  pilar: true,
  objective: true,
  hook: true,
  cta: true,
  hashtags: true,
  slides: true,
  script: true,
  visualBrief: true,
  storySupport: true,
} satisfies Prisma.ContentPostSelect;

export const taskRecordSelect = {
  id: true,
  title: true,
  type: true,
  description: true,
  priority: true,
  status: true,
  dueDate: true,
  completedAt: true,
  notes: true,
  clientId: true,
  projectId: true,
} satisfies Prisma.ProductionTaskSelect;

// Das telas que mostram o cliente ao lado do item, só o nome é lido.
export const postWithClientSelect = {
  ...postRecordSelect,
  client: { select: { name: true } },
} satisfies Prisma.ContentPostSelect;

export const taskWithClientSelect = {
  ...taskRecordSelect,
  client: { select: { name: true } },
} satisfies Prisma.ProductionTaskSelect;

/**
 * Garante que o cliente esteja vinculado ao negócio.
 *
 * Os selects de cliente mostram a agenda inteira, não só quem já é do negócio
 * — é comum a mesma pessoa ser cliente da Ace e da Creative. Quando ela é
 * escolhida num negócio onde ainda não tinha vínculo, o vínculo nasce aqui.
 * `upsert` com `update: {}` é intencional: se já existe, nada é sobrescrito,
 * então um vínculo marcado como INATIVO não volta para ATIVO sozinho.
 */
export async function linkClientToBusiness(clientId: string, businessId: string) {
  await prisma.clientBusiness.upsert({
    where: { clientId_businessId: { clientId, businessId } },
    create: { clientId, businessId, status: "ATIVO" },
    update: {},
  });
}
