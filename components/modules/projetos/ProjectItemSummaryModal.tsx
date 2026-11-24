"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button, Modal, ModalActions } from "@/components/ui";
import { formatMinutes } from "@/lib/task-plan";
import { cn, formatDateBR } from "@/lib/utils";
import type { ProjectItem } from "./ProjectCalendar";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-text-primary">{children}</dd>
    </div>
  );
}

/** Resumo de um item do calendário geral, sem sair da página de projetos. */
export function ProjectItemSummaryModal({
  item,
  onClose,
}: {
  item: ProjectItem;
  onClose: () => void;
}) {
  const { detail, context, steps } = item;
  const dateLabel = item.kind === "post" ? "Publicação" : item.kind === "task" ? "Prazo" : "Fim do projeto";
  const openLabel =
    item.kind === "project" ? "Abrir projeto" : item.kind === "task" ? "Abrir tarefa" : "Abrir post";

  return (
    <Modal title={item.title} onClose={onClose} size="md">
      <div className="flex flex-col gap-4">
        <span
          className={cn(
            "self-start rounded px-2 py-0.5 text-xs font-medium",
            item.statusColor,
          )}
        >
          {item.statusLabel}
        </span>

        <dl className="grid grid-cols-2 gap-3">
          <Field label="Tipo">{item.typeLabel}</Field>
          {item.date && <Field label={dateLabel}>{formatDateBR(new Date(item.date))}</Field>}
          {context && (
            <Field label="Projeto">
              <span
                aria-hidden="true"
                className="mr-1.5 inline-block size-2 rounded-full"
                style={{ backgroundColor: context.color }}
              />
              {context.projectName}
              <span className="block text-xs text-text-secondary">{context.businessName}</span>
            </Field>
          )}
          {detail?.priorityLabel && <Field label="Prioridade">{detail.priorityLabel}</Field>}
          {detail?.estimateMinutes ? (
            <Field label="Tempo estimado">{formatMinutes(detail.estimateMinutes)}</Field>
          ) : null}
          {detail?.networkLabel && <Field label="Rede social">{detail.networkLabel}</Field>}
          {item.finishedOn && (
            <Field label={item.done ? "Concluída em" : "Finalizar até"}>
              {formatDateBR(new Date(item.finishedOn))}
            </Field>
          )}
        </dl>

        {steps && (
          <div>
            <p className="mb-1 flex justify-between text-xs text-text-secondary">
              <span>Passos</span>
              <span className="tabular-nums">
                {steps.done}/{steps.total}
              </span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-hover">
              <div
                className="h-full bg-accent"
                style={{ width: `${(steps.done / steps.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {detail?.description && (
          <Field label={item.kind === "post" ? "Legenda" : "Descrição"}>
            <p className="line-clamp-6 whitespace-pre-wrap">{detail.description}</p>
          </Field>
        )}
        {detail?.notes && (
          <Field label="Anotações">
            <p className="line-clamp-4 whitespace-pre-wrap">{detail.notes}</p>
          </Field>
        )}
      </div>

      <ModalActions>
        <Button variant="secondary" type="button" onClick={onClose}>
          Fechar
        </Button>
        {context && (
          <Link
            href={context.href}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-contrast hover:bg-accent/90"
          >
            {openLabel}
            <ExternalLink size={14} />
          </Link>
        )}
      </ModalActions>
    </Modal>
  );
}
