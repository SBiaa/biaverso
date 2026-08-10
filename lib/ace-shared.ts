import { nextUtcDay, todayUtc } from "@/lib/utils";
import type { ContentStatus, ProductionStatus } from "@/app/generated/prisma/client";

// Pure helpers/constants shared between server code and client components —
// this file must never import "@/lib/prisma" (it would pull the Postgres
// driver into the browser bundle for any "use client" component that imports it).

export type AceItemKind = "post" | "task";

/** Escopo do cronograma: conteúdo de cliente, interno do negócio, ou os dois. */
export const SCOPE_OPTIONS = [
  { key: "", label: "Todos" },
  { key: "clientes", label: "Clientes" },
  { key: "interno", label: "Interno" },
] as const;

/**
 * Filtro de `clientId` para um escopo. `undefined` = sem filtro, `null` = só o
 * que não tem cliente (interno).
 */
export function scopeClientFilter(scope?: string) {
  if (scope === "interno") return null;
  if (scope === "clientes") return { not: null };
  return undefined;
}

export const KANBAN_COLUMNS = [
  { key: "A_FAZER", label: "A fazer" },
  { key: "EM_ANDAMENTO", label: "Em andamento" },
  { key: "AGUARDANDO_APROVACAO", label: "Aguardando aprovação" },
  { key: "CONCLUIDO", label: "Concluído" },
] as const;

export type KanbanColumnKey = (typeof KANBAN_COLUMNS)[number]["key"];

const contentStatusToColumn: Record<string, KanbanColumnKey | null> = {
  PLANEJADO: "A_FAZER",
  EM_CRIACAO: "EM_ANDAMENTO",
  APROVADO: "AGUARDANDO_APROVACAO",
  PUBLICADO: "CONCLUIDO",
  CANCELADO: null,
};

const productionStatusToColumn: Record<string, KanbanColumnKey | null> = {
  A_FAZER: "A_FAZER",
  EM_ANDAMENTO: "EM_ANDAMENTO",
  AGUARDANDO_APROVACAO: "AGUARDANDO_APROVACAO",
  CONCLUIDO: "CONCLUIDO",
  CANCELADO: null,
};

export function getKanbanColumn(kind: AceItemKind, status: string): KanbanColumnKey | null {
  return kind === "post" ? contentStatusToColumn[status] : productionStatusToColumn[status];
}

export const contentStatusColors: Record<string, string> = {
  PLANEJADO: "bg-slate-100 text-slate-700",
  EM_CRIACAO: "bg-amber-100 text-amber-800",
  APROVADO: "bg-blue-100 text-blue-700",
  PUBLICADO: "bg-emerald-100 text-emerald-700",
  CANCELADO: "bg-red-100 text-red-700",
};

export const productionStatusColors: Record<string, string> = {
  A_FAZER: "bg-slate-100 text-slate-700",
  EM_ANDAMENTO: "bg-amber-100 text-amber-800",
  AGUARDANDO_APROVACAO: "bg-blue-100 text-blue-700",
  CONCLUIDO: "bg-emerald-100 text-emerald-700",
  CANCELADO: "bg-red-100 text-red-700",
};

export const donePostStatuses: ContentStatus[] = ["PUBLICADO", "CANCELADO"];
export const doneTaskStatuses: ProductionStatus[] = ["CONCLUIDO", "CANCELADO"];

/** Intervalo [início, fim) de um dia, em UTC — o referencial em que as datas são gravadas. */
export function getUtcDayRange(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return { start, end: nextUtcDay(start) };
}

export function isOverdue(dueDate: Date | null, status: string, doneStatuses: string[]) {
  if (!dueDate || doneStatuses.includes(status)) return false;
  return dueDate.getTime() < todayUtc().getTime();
}

export function isPostOverdue(post: { publishDate: Date | null; status: string }) {
  return isOverdue(post.publishDate, post.status, donePostStatuses);
}

export function isTaskOverdue(task: { dueDate: Date | null; status: string }) {
  return isOverdue(task.dueDate, task.status, doneTaskStatuses);
}

// Preenche completedAt automaticamente quando o item entra no status final,
// sem sobrescrever uma data já definida manualmente pelo usuário.
export function resolvePostCompletedAt(
  status: string,
  completedAt: Date | null | undefined,
  previousCompletedAt: Date | null,
) {
  if (completedAt !== undefined) return completedAt ?? null;
  if (status === "PUBLICADO" && !previousCompletedAt) return new Date();
  return previousCompletedAt;
}

export function resolveTaskCompletedAt(
  status: string,
  completedAt: Date | null | undefined,
  previousCompletedAt: Date | null,
) {
  if (completedAt !== undefined) return completedAt ?? null;
  if (status === "CONCLUIDO" && !previousCompletedAt) return new Date();
  return previousCompletedAt;
}

/**
 * Linha do banco → o formato que os modais editam (datas em ISO). As telas
 * montavam esse objeto à mão em cada lugar; um campo novo ficava faltando em
 * uma delas.
 */
export function toPostRecord(post: {
  id: string;
  title: string;
  type: string;
  network: string;
  status: string;
  publishDate: Date | null;
  completedAt: Date | null;
  caption: string | null;
  notes: string | null;
  clientId: string | null;
  projectId: string | null;
}) {
  return {
    id: post.id,
    title: post.title,
    type: post.type,
    network: post.network,
    status: post.status,
    publishDate: post.publishDate ? post.publishDate.toISOString() : null,
    completedAt: post.completedAt ? post.completedAt.toISOString() : null,
    caption: post.caption,
    notes: post.notes,
    clientId: post.clientId,
    projectId: post.projectId,
  };
}

export function toTaskRecord(task: {
  id: string;
  title: string;
  type: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: Date | null;
  completedAt: Date | null;
  notes: string | null;
  clientId: string | null;
  projectId: string | null;
}) {
  return {
    id: task.id,
    title: task.title,
    type: task.type,
    description: task.description,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    notes: task.notes,
    clientId: task.clientId,
    projectId: task.projectId,
  };
}

export type ClientOverview = {
  id: string;
  name: string;
  activeProjectCount: number;
  nextDelivery: { date: string; title: string; kind: AceItemKind } | null;
};

export type PendingItem = {
  id: string;
  kind: AceItemKind;
  title: string;
  statusLabel: string;
  dueOrPublishDate: string | null;
  overdue: boolean;
  projectId: string | null;
  projectName: string | null;
};

export type MonthlyHistoryEntry = {
  month: number;
  year: number;
  label: string;
  publishedCount: number;
  completedCount: number;
  pendingOrLate: {
    id: string;
    kind: AceItemKind;
    title: string;
    dueOrPublishDate: string | null;
    completedAt: string | null;
    late: boolean;
  }[];
};
