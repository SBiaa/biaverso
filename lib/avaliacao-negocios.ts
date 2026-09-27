import { prisma } from "@/lib/prisma";
import { donePostStatuses, doneTaskStatuses } from "@/lib/ace-shared";
import type { ModuleType } from "@/app/generated/prisma/client";

/**
 * Como foi cada negócio num período (a semana ou o mês da avaliação).
 *
 * A avaliação só olhava para a vida pessoal: hábitos, casa, humor. Os negócios
 * ficavam de fora, e ela tinha que abrir cada um para lembrar o que andou. Aqui
 * é a mesma ideia do resumo do mês: nada é perguntado a ela, tudo sai do que já
 * foi marcado como feito (post publicado, tarefa concluída, pedido entregue,
 * transação lançada) dentro da janela.
 *
 * O que ainda está aberto e venceu dentro da janela também aparece — é o
 * "ficou para trás" do período, que é o que ela quer enxergar numa avaliação.
 *
 * Cada negócio só ganha as contagens dos módulos que tem ligados: um negócio
 * sem loja não mostra "0 pedidos".
 */

export type BusinessPeriodSummary = {
  id: string;
  name: string;
  color: string;
  modules: ModuleType[];
  /** Posts publicados no período (pela data de publicação de fato). */
  postsPublished: number | null;
  /** Posts que deviam ter saído no período e ainda não saíram. */
  postsLate: number | null;
  tasksDone: number | null;
  tasksLate: number | null;
  /** Tarefas do dia a dia (do /dia) ligadas ao negócio e concluídas. */
  dayTasksDone: number;
  ordersNew: number | null;
  ordersDelivered: number | null;
  /** Soma dos pedidos entregues no período. */
  ordersRevenue: number | null;
  moneyIn: number | null;
  moneyOut: number | null;
  /** Soma simples do que aconteceu: para ordenar e para dizer "nada". */
  activity: number;
};

export async function getBusinessPeriodSummary(
  start: Date,
  end: Date,
): Promise<BusinessPeriodSummary[]> {
  const window = { gte: start, lt: end };

  const [businesses, posts, latePosts, tasks, lateTasks, dayTasks, newOrders, deliveredOrders, money] =
    await Promise.all([
      prisma.business.findMany({
        where: { active: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          color: true,
          modules: { where: { active: true }, select: { module: true } },
        },
      }),
      prisma.contentPost.groupBy({
        by: ["businessId"],
        where: { status: "PUBLICADO", completedAt: window },
        _count: { _all: true },
      }),
      prisma.contentPost.groupBy({
        by: ["businessId"],
        where: { status: { notIn: donePostStatuses }, publishDate: window },
        _count: { _all: true },
      }),
      prisma.productionTask.groupBy({
        by: ["businessId"],
        where: { status: "CONCLUIDO", completedAt: window },
        _count: { _all: true },
      }),
      prisma.productionTask.groupBy({
        by: ["businessId"],
        where: { status: { notIn: doneTaskStatuses }, dueDate: window },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ["businessId"],
        where: { done: true, completedAt: window, businessId: { not: null } },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ["businessId"],
        where: { orderDate: window, status: { not: "CANCELADO" } },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ["businessId"],
        where: { status: "ENTREGUE", completedAt: window },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      prisma.transaction.groupBy({
        by: ["businessId", "type"],
        where: { date: window, businessId: { not: null } },
        _sum: { amount: true },
      }),
    ]);

  const countOf = (rows: { businessId: string | null; _count: { _all: number } }[], id: string) =>
    rows.find((r) => r.businessId === id)?._count._all ?? 0;

  return businesses
    .map((b): BusinessPeriodSummary => {
      const modules = b.modules.map((m) => m.module);
      const has = (m: ModuleType) => modules.includes(m);

      const delivered = deliveredOrders.find((r) => r.businessId === b.id);
      const moneyFor = (type: "ENTRADA" | "SAIDA") =>
        money.find((r) => r.businessId === b.id && r.type === type)?._sum.amount ?? 0;

      const summary: BusinessPeriodSummary = {
        id: b.id,
        name: b.name,
        color: b.color,
        modules,
        postsPublished: has("CRONOGRAMA") ? countOf(posts, b.id) : null,
        postsLate: has("CRONOGRAMA") ? countOf(latePosts, b.id) : null,
        tasksDone: has("PRODUCAO") ? countOf(tasks, b.id) : null,
        tasksLate: has("PRODUCAO") ? countOf(lateTasks, b.id) : null,
        dayTasksDone: countOf(dayTasks, b.id),
        ordersNew: has("PEDIDOS") ? countOf(newOrders, b.id) : null,
        ordersDelivered: has("PEDIDOS") ? (delivered?._count._all ?? 0) : null,
        ordersRevenue: has("PEDIDOS") ? (delivered?._sum.totalAmount ?? 0) : null,
        moneyIn: has("FINANCEIRO") ? moneyFor("ENTRADA") : null,
        moneyOut: has("FINANCEIRO") ? moneyFor("SAIDA") : null,
        activity: 0,
      };

      summary.activity =
        (summary.postsPublished ?? 0) +
        (summary.postsLate ?? 0) +
        (summary.tasksDone ?? 0) +
        (summary.tasksLate ?? 0) +
        summary.dayTasksDone +
        (summary.ordersNew ?? 0) +
        (summary.ordersDelivered ?? 0) +
        (summary.moneyIn ? 1 : 0) +
        (summary.moneyOut ? 1 : 0);

      return summary;
    })
    .sort((a, b) => b.activity - a.activity);
}
