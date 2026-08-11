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

  for (const task of tasks ?? []) {
    if (!task.dueDate) continue;
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
    if (!post.publishDate) continue;
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

  const monthIn = entradas ? (entradas._sum.amount ?? 0) : null;
  const monthOut = saidas ? (saidas._sum.amount ?? 0) : null;

  return {
    stats: {
      activeProjects,
      activeClients,
      openTasks: tasks?.length ?? null,
      // "Planejados" no sentido de ainda não publicados.
      plannedPosts: posts?.length ?? null,
      openOrders: orders?.length ?? null,
      monthIn,
      monthOut,
      monthBalance: monthIn !== null && monthOut !== null ? monthIn - monthOut : null,
    },
    deadlines: visible,
    overdueCount,
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
