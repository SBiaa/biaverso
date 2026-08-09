import { startOfToday } from "@/lib/utils";
import type { ContentStatus, ProductionStatus } from "@/app/generated/prisma/client";

// Pure helpers/constants shared between server code and client components —
// this file must never import "@/lib/prisma" (it would pull the Postgres
// driver into the browser bundle for any "use client" component that imports it).

export type AceItemKind = "post" | "task";

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

// Datas de posts/tarefas Ace são gravadas como meia-noite UTC (a partir de <input type="date">),
// então o dia "local" precisa ser convertido para o mesmo referencial antes de comparar no banco.
export function getUtcDayRange(localDate: Date) {
  const start = new Date(
    Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function isOverdue(dueDate: Date | null, status: string, doneStatuses: string[]) {
  if (!dueDate || doneStatuses.includes(status)) return false;
  const { start: todayUtc } = getUtcDayRange(startOfToday());
  return dueDate.getTime() < todayUtc.getTime();
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
  completedAt: string | null | undefined,
  previousCompletedAt: Date | null,
) {
  if (completedAt !== undefined) return completedAt ? new Date(completedAt) : null;
  if (status === "PUBLICADO" && !previousCompletedAt) return new Date();
  return previousCompletedAt;
}

export function resolveTaskCompletedAt(
  status: string,
  completedAt: string | null | undefined,
  previousCompletedAt: Date | null,
) {
  if (completedAt !== undefined) return completedAt ? new Date(completedAt) : null;
  if (status === "CONCLUIDO" && !previousCompletedAt) return new Date();
  return previousCompletedAt;
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
