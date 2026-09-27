"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Card, ErrorNote, IconButton, confirmAction, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatDateLongBR, parseDateOnly } from "@/lib/utils";
import {
  moonPhaseGlyph,
  moonPhaseLabels,
  moonPhaseOfDay,
  ritualKindLabels,
  type RitualView,
} from "@/lib/espiritual-shared";
import { RitualForm } from "./RitualForm";

/** Um bloco de texto com rótulo, só quando há texto. */
function Block({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm text-text-primary">{text}</p>
    </div>
  );
}

export function RitualCard({ ritual }: { ritual: RitualView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return <RitualForm ritual={ritual} onClose={() => setEditing(false)} />;
  }

  const date = parseDateOnly(ritual.date);
  // A fase não está gravada: sai da data, então nunca contradiz o calendário.
  const moon = date ? moonPhaseOfDay(date) : null;

  async function handleDelete() {
    const ok = await confirmAction({
      title: "Excluir este registro?",
      description: "O que foi escrito aqui não volta.",
      destructive: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/api/rituals/${ritual.id}`);
      router.refresh();
      notify("Excluído.");
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
            {ritualKindLabels[ritual.kind] ?? ritual.kind}
          </p>
          <p className="text-sm font-semibold text-text-primary">{ritual.title}</p>
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

      <p className="flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
        <span>{date ? formatDateLongBR(date) : ritual.date}</span>
        {moon && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>{moonPhaseGlyph[moon.phase]}</span>
            {moonPhaseLabels[moon.phase]}
          </span>
        )}
      </p>

      <Block label="Intenção" text={ritual.intention} />
      <Block label="O que usou" text={ritual.elements} />
      <Block label="Como foi" text={ritual.notes} />

      {ritual.outcome && (
        <div className="rounded-lg bg-hover p-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            O que veio depois
          </p>
          <p className="whitespace-pre-wrap text-sm text-text-primary">
            {ritual.outcome}
          </p>
        </div>
      )}
    </Card>
  );
}
