"use client";

import type { TaskStatus } from "@/app/generated/prisma/enums";
import { cn } from "@/lib/utils";

/**
 * Os estados de uma tarefa do dia a dia. Além do andamento (iniciei, pausei,
 * concluí), tem o que travou ou pesa: aguardando algo, travada, com ansiedade
 * para fazer. A ordem aqui é a ordem do menu.
 */
export const taskStatusLabels: Record<TaskStatus, string> = {
  A_FAZER: "A fazer",
  INICIADA: "Iniciei",
  PAUSADA: "Pausei",
  AGUARDANDO: "Aguardando algo",
  TRAVADA: "Travei em algo",
  COM_ANSIEDADE: "Com ansiedade",
  CONCLUIDA: "Concluí",
};

export const taskStatusOptions = Object.keys(taskStatusLabels) as TaskStatus[];

const statusStyles: Record<TaskStatus, string> = {
  A_FAZER: "bg-border text-text-secondary",
  INICIADA: "bg-success-soft-bg text-success-soft-text",
  PAUSADA: "bg-border text-text-primary",
  AGUARDANDO: "bg-warning-soft-bg text-warning-soft-text",
  TRAVADA: "bg-danger-soft-bg text-danger-soft-text",
  COM_ANSIEDADE: "bg-badge-creative-bg text-badge-creative-text",
  CONCLUIDA: "bg-success-soft-bg text-success-soft-text",
};

/**
 * Select nativo vestido de selo: no celular abre o seletor do sistema, que é
 * mais fácil de acertar com o dedo do que um menu desenhado à mão.
 */
export function TaskStatusPicker({
  status,
  title,
  onChange,
}: {
  status: TaskStatus;
  title: string;
  onChange: (status: TaskStatus) => void;
}) {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      aria-label={`Status de ${title}`}
      className={cn(
        "cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none focus:ring-2 focus:ring-accent",
        statusStyles[status],
      )}
    >
      {taskStatusOptions.map((s) => (
        <option key={s} value={s}>
          {taskStatusLabels[s]}
        </option>
      ))}
    </select>
  );
}
