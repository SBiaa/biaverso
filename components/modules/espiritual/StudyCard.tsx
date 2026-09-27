"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import {
  AttentionBadge,
  Card,
  ErrorNote,
  IconButton,
  attentionBorder,
  attentionFromDueDate,
  attentionText,
  confirmAction,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatDateBR, parseDateOnly } from "@/lib/utils";
import {
  studyKindLabels,
  studyStatusLabels,
  type MeetingOption,
  type StudyView,
} from "@/lib/espiritual-shared";
import { StudyForm } from "./StudyForm";
import { inputClass } from "./form-kit";

/** Como o prazo aparece: a distância importa mais que a data em si. */
function dueLabel(dueDate: Date, today: Date) {
  const days = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "entrega hoje";
  if (days === 1) return "entrega amanhã";
  if (days < 0) return `${Math.abs(days)} dias atrasado`;
  return `faltam ${days} dias`;
}

export function StudyCard({
  study,
  meetings,
  today,
}: {
  study: StudyView;
  meetings: MeetingOption[];
  /** "YYYY-MM-DD" — vem do servidor para os dois lados contarem o mesmo dia. */
  today: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(study.status);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <StudyForm
        study={study}
        meetings={meetings}
        onClose={() => setEditing(false)}
      />
    );
  }

  const todayDate = parseDateOnly(today)!;
  const due = study.dueDate ? parseDateOnly(study.dueDate) : null;
  const delivered = status === "ENTREGUE";
  const level = attentionFromDueDate(due, todayDate, { done: delivered });

  async function changeStatus(next: string) {
    const previous = status;
    setStatus(next);
    setError(null);

    try {
      await api.patch(`/api/spiritual-studies/${study.id}`, { status: next });
      // O servidor carimba (ou limpa) a data de entrega junto — sem o refresh a
      // tela seguiria mostrando a data antiga.
      router.refresh();
    } catch (e) {
      setStatus(previous);
      setError(errorMessage(e));
    }
  }

  async function handleDelete() {
    const ok = await confirmAction({
      title: "Excluir este material?",
      description: "As suas anotações vão junto e não dá para desfazer.",
      destructive: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/api/spiritual-studies/${study.id}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Card className={cn("group flex flex-col gap-2", attentionBorder[level])}>
      <ErrorNote message={error} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary">
            {studyKindLabels[study.kind] ?? study.kind}
            {study.meetingTitle && ` · ${study.meetingTitle}`}
          </p>
          <p className="text-sm font-semibold text-text-primary">{study.title}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <IconButton aria-label="Editar" revealOnHover onClick={() => setEditing(true)}>
            <Pencil size={15} />
          </IconButton>
          <IconButton
            aria-label="Excluir"
            tone="danger"
            revealOnHover
            onClick={handleDelete}
          >
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => changeStatus(e.target.value)}
          aria-label="Como está"
          className={cn(inputClass, "py-1 text-xs")}
        >
          {Object.entries(studyStatusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {due && !delivered && (
          <AttentionBadge level={level}>{dueLabel(due, todayDate)}</AttentionBadge>
        )}
        {due && (
          <span className={cn("text-xs", delivered ? "text-text-secondary" : attentionText[level])}>
            {formatDateBR(due)}
          </span>
        )}
        {delivered && study.deliveredAt && (
          <span className="text-xs text-text-secondary">
            entregue em {formatDateBR(parseDateOnly(study.deliveredAt)!)}
          </span>
        )}
      </div>

      {study.content && (
        <details className="rounded-lg bg-hover p-2.5">
          <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            O material
          </summary>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-text-primary">
            {study.content}
          </p>
        </details>
      )}

      {study.notes && (
        <details open className="rounded-lg border border-border/60 p-2.5">
          <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            Suas anotações
          </summary>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-text-primary">
            {study.notes}
          </p>
        </details>
      )}

      {study.link && (
        <a
          href={study.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-accent"
        >
          <ExternalLink size={12} />
          Abrir link
        </a>
      )}
    </Card>
  );
}
