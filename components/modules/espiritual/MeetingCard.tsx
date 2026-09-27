"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Pencil, Trash2 } from "lucide-react";
import {
  AttentionBadge,
  Card,
  ErrorNote,
  IconButton,
  confirmAction,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatDateLongBR, parseDateOnly } from "@/lib/utils";
import {
  covenMeetingKindLabels,
  studyStatusLabels,
  type MeetingView,
} from "@/lib/espiritual-shared";
import { MeetingForm } from "./MeetingForm";

export function MeetingCard({ meeting }: { meeting: MeetingView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return <MeetingForm meeting={meeting} onClose={() => setEditing(false)} />;
  }

  const date = parseDateOnly(meeting.date);

  async function handleDelete() {
    const ok = await confirmAction({
      title: "Excluir este encontro?",
      description:
        "Ele sai também da agenda e do Google Calendar. As anotações vão junto.",
      destructive: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/api/coven-meetings/${meeting.id}`);
      router.refresh();
      notify("Encontro excluído.");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Card className="group flex flex-col gap-2">
      <ErrorNote message={error} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary">
            {covenMeetingKindLabels[meeting.kind] ?? meeting.kind}
          </p>
          <p className="text-sm font-semibold text-text-primary">{meeting.title}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <IconButton
            aria-label="Editar encontro"
            revealOnHover
            onClick={() => setEditing(true)}
          >
            <Pencil size={15} />
          </IconButton>
          <IconButton
            aria-label="Excluir encontro"
            tone="danger"
            revealOnHover
            onClick={handleDelete}
          >
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>

      <p className="text-sm text-text-primary">
        {date ? formatDateLongBR(date) : meeting.date}
        {meeting.time && (
          <span className="text-text-secondary">
            {" "}
            · {meeting.time}
            {meeting.endTime ? ` às ${meeting.endTime}` : ""}
          </span>
        )}
      </p>

      {meeting.place && (
        <p className="text-xs text-text-secondary">{meeting.place}</p>
      )}

      {meeting.agenda && (
        <div className="rounded-lg bg-hover p-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            Pauta
          </p>
          <p className="whitespace-pre-wrap text-sm text-text-primary">
            {meeting.agenda}
          </p>
        </div>
      )}

      {meeting.notes && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            Como foi
          </p>
          <p className="whitespace-pre-wrap text-sm text-text-primary">
            {meeting.notes}
          </p>
        </div>
      )}

      {meeting.studies.length > 0 && (
        <div className="border-t border-border/60 pt-2">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            Saiu daqui
          </p>
          <ul className="flex flex-col gap-1">
            {meeting.studies.map((study) => (
              <li
                key={study.id}
                className="flex items-baseline justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate text-text-primary">
                  {study.title}
                </span>
                <span className="shrink-0 text-xs text-text-secondary">
                  {studyStatusLabels[study.status] ?? study.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {meeting.attended === true && (
          <AttentionBadge level="ok">Fui</AttentionBadge>
        )}
        {meeting.attended === false && (
          <AttentionBadge level="neutro">Não fui</AttentionBadge>
        )}
        {meeting.onAgenda && (
          <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
            <CalendarCheck size={12} />
            na agenda
          </span>
        )}
      </div>
    </Card>
  );
}
