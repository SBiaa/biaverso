import { prisma } from "@/lib/prisma";
import { donePostStatuses, doneTaskStatuses } from "@/lib/ace-shared";
import { addUtcDays, getMonthRange, todayUtc } from "@/lib/utils";
import type { ModuleType } from "@/app/generated/prisma/client";

/**
 * Dados da home de um negócio.
 *
 * Só consulta o que os módulos ligados pedem: um negócio sem PEDIDOS não paga
 * o custo da consulta de pedidos. Tudo em paralelo, senão a aba viraria uma
 * fila de seis idas ao banco.
 */

export type DeadlineItem = {
  id: string;
  kind: "post" | "task" | "order";
  title: string;
  subtitle: string | null;
  date: string;
  overdue: boolean;
};

export type BusinessOverview = {
  stats: {
    activeProjects: number | null;
    activeClients: number | null;
    openTasks: number | null;
    plannedPosts: number | null;
    openOrders: number | null;
    monthBalance: number | null;
    monthIn: number | null;
    monthOut: number | null;
  };
  /** Vencendo nos próximos 7 dias ou já atrasado, do mais urgente ao menos. */
  deadlines: DeadlineItem[];
  overdueCount: number;
  /** Prazos perdidos (tarefas e posts), por mês do prazo, dos últimos 6 meses. */
  missed: { total: number; months: { label: string; tasks: number; posts: number }[] } | null;
  recentTransactions: {
    id: string;
    name: string;
    type: string;
    amount: number;
    date: string;
    category: string;
  }[];
};

export async function getBusinessOverview(
  businessId: string,
  modules: ModuleType[],
): Promise<BusinessOverview> {
  const today = todayUtc();
  const horizon = addUtcDays(today, 7);
  const { start: monthStart, end: monthEnd } = getMonthRange(today);

  const has = (m: ModuleType) => modules.includes(m);

  const [
    activeProjects,
    activeClients,
    tasks,
    posts,
    orders,
    entradas,
    saidas,
    recentTransactions,
  ] = await Promise.all([
    has("PROJETOS")
      ? prisma.project.count({ where: { businessId, status: "EM_ANDAMENTO" } })
      : null,
    has("CLIENTES")
      ? prisma.clientBusiness.count({ where: { businessId, status: "ATIVO" } })
      : null,
    has("PRODUCAO")
      ? prisma.productionTask.findMany({
          where: { businessId, status: { notIn: doneTaskStatuses } },
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            client: { select: { name: true } },
          },
        })
      : null,
    has("CRONOGRAMA")
      ? prisma.contentPost.findMany({
          where: { businessId, status: { notIn: donePostStatuses } },
          select: {
            id: true,
            title: true,
            status: true,
            publishDate: true,
            client: { select: { name: true } },
          },
        })
      : null,
    has("PEDIDOS")
      ? prisma.order.findMany({
          where: { businessId, status: { notIn: ["ENTREGUE", "CANCELADO"] } },
          select: { id: true, customerName: true, dueDate: true, totalAmount: true },
        })
      : null,
    has("FINANCEIRO")
      ? prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            businessId,
            type: "ENTRADA",
            date: { gte: monthStart, lt: monthEnd },
          },
        })
      : null,
    has("FINANCEIRO")
      ? prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            businessId,
            type: "SAIDA",
            date: { gte: monthStart, lt: monthEnd },
          },
        })
      : null,
    has("FINANCEIRO")
      ? prisma.transaction.findMany({
          where: { businessId },
          orderBy: { date: "desc" },
          take: 5,
          select: {
            id: true,
            name: true,
            type: true,
            amount: true,
            date: true,
            category: true,
          },
        })
      : null,
  ]);

  const deadlines: DeadlineItem[] = [];

  // Prazo perdido tem conta e gráfico próprios: fica fora dos atrasados e da
  // lista de prazos, senão o aviso vermelho nunca zera.
  for (const task of tasks ?? []) {
    if (!task.dueDate || task.status === "PRAZO_PERDIDO") continue;
    deadlines.push({
      id: task.id,
      kind: "task",
      title: task.title,
      subtitle: task.client?.name ?? "Interno",
      date: task.dueDate.toISOString(),
      overdue: task.dueDate.getTime() < today.getTime(),
    });
  }

  for (const post of posts ?? []) {
    if (!post.publishDate || post.status === "PRAZO_PERDIDO") continue;
    deadlines.push({
      id: post.id,
      kind: "post",
      title: post.title,
      subtitle: post.client?.name ?? "Interno",
      date: post.publishDate.toISOString(),
      overdue: post.publishDate.getTime() < today.getTime(),
    });
  }

  for (const order of orders ?? []) {
    if (!order.dueDate) continue;
    deadlines.push({
      id: order.id,
      kind: "order",
      title: order.customerName,
      subtitle: "Pedido",
      date: order.dueDate.toISOString(),
      overdue: order.dueDate.getTime() < today.getTime(),
    });
  }

  const overdueCount = deadlines.filter((d) => d.overdue).length;

  // Atrasado sempre aparece; em dia, só até uma semana à frente — o resto vira
  // ruído numa tela que é para bater o olho.
  const visible = deadlines
    .filter((d) => d.overdue || new Date(d.date).getTime() < horizon.getTime())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const missed = buildMissed(
    (tasks ?? []).filter((t) => t.status === "PRAZO_PERDIDO").map((t) => t.dueDate),
    (posts ?? []).filter((p) => p.status === "PRAZO_PERDIDO").map((p) => p.publishDate),
    today,
    tasks !== null || posts !== null,
  );

  const monthIn = entradas ? (entradas._sum.amount ?? 0) : null;
  const monthOut = saidas ? (saidas._sum.amount ?? 0) : null;

  return {
    stats: {
      activeProjects,
      activeClients,
      openTasks: tasks ? tasks.filter((t) => t.status !== "PRAZO_PERDIDO").length : null,
      // "Planejados" no sentido de ainda não publicados.
      plannedPosts: posts ? posts.filter((p) => p.status !== "PRAZO_PERDIDO").length : null,
      openOrders: orders?.length ?? null,
      monthIn,
      monthOut,
      monthBalance: monthIn !== null && monthOut !== null ? monthIn - monthOut : null,
    },
    deadlines: visible,
    overdueCount,
    missed,
    recentTransactions: (recentTransactions ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      amount: t.amount,
      date: t.date.toISOString(),
      category: t.category,
    })),
  };
}

/** Conta os prazos perdidos por mês do prazo (os 6 últimos meses, o atual incluso). */
function buildMissed(
  taskDates: (Date | null)[],
  postDates: (Date | null)[],
  today: Date,
  enabled: boolean,
): BusinessOverview["missed"] {
  if (!enabled) return null;

  const key = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();
  const current = key(today);
  const months = Array.from({ length: 6 }, (_, i) => {
    const k = current - 5 + i;
    const date = new Date(Date.UTC(Math.floor(k / 12), k % 12, 1));
    const label = date
      .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
      .replace(".", "");
    return { k, label, tasks: 0, posts: 0 };
  });

  for (const d of taskDates) {
    const m = d && months.find((x) => x.k === key(d));
    if (m) m.tasks += 1;
  }
  for (const d of postDates) {
    const m = d && months.find((x) => x.k === key(d));
    if (m) m.posts += 1;
  }

  return {
    total: taskDates.length + postDates.length,
    months: months.map(({ label, tasks, posts }) => ({ label, tasks, posts })),
  };
}
