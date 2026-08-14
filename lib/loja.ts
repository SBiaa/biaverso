import { todayUtc } from "@/lib/utils";
import type { OrderStatus } from "@/app/generated/prisma/client";

/**
 * Pedidos e coleções (módulos PEDIDOS e COLECOES). Puro — não importa
 * "@/lib/prisma", então os componentes "use client" também podem usar.
 */

/** Colunas do kanban de pedidos. CANCELADO fica fora: não é etapa, é fim de linha. */
export const ORDER_COLUMNS = [
  { key: "PENDENTE", label: "Pendente" },
  { key: "EM_PRODUCAO", label: "Em produção" },
  { key: "PRONTO", label: "Pronto" },
  { key: "ENVIADO", label: "Enviado" },
  { key: "ENTREGUE", label: "Entregue" },
] as const;

export const orderStatusColors: Record<string, string> = {
  PENDENTE: "bg-slate-100 text-slate-700",
  EM_PRODUCAO: "bg-amber-100 text-amber-800",
  PRONTO: "bg-blue-100 text-blue-700",
  ENVIADO: "bg-violet-100 text-violet-700",
  ENTREGUE: "bg-emerald-100 text-emerald-700",
  CANCELADO: "bg-red-100 text-red-700",
};

export const collectionStatusColors: Record<string, string> = {
  IDEIA: "bg-slate-100 text-slate-700",
  EM_DESENVOLVIMENTO: "bg-amber-100 text-amber-800",
  PRONTA: "bg-blue-100 text-blue-700",
  LANCADA: "bg-emerald-100 text-emerald-700",
  ENCERRADA: "bg-border text-text-secondary",
};

/** Fim de linha: um pedido nesses status não fica vermelho por prazo vencido. */
export const doneOrderStatuses: OrderStatus[] = ["ENTREGUE", "CANCELADO"];

export function isOrderOverdue(order: { dueDate: Date | null; status: string }) {
  if (!order.dueDate || doneOrderStatuses.includes(order.status as OrderStatus)) {
    return false;
  }
  return order.dueDate.getTime() < todayUtc().getTime();
}

/**
 * Preenche `completedAt` quando o pedido é entregue, sem sobrescrever uma data
 * já definida à mão — mesmo comportamento dos itens do cronograma.
 */
export function resolveOrderCompletedAt(
  status: string,
  completedAt: Date | null | undefined,
  previousCompletedAt: Date | null,
) {
  if (completedAt !== undefined) return completedAt ?? null;
  if (status === "ENTREGUE" && !previousCompletedAt) return new Date();
  return previousCompletedAt;
}
