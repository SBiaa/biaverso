"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Card, ErrorNote, IconButton, confirmAction, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatDateLongBR, parseDateOnly } from "@/lib/utils";
import {
  divinationMethodLabels,
  moonPhaseGlyph,
  moonPhaseLabels,
  moonPhaseOfDay,
  type DivinationView,
} from "@/lib/espiritual-shared";
import { DivinationForm } from "./DivinationForm";

export function DivinationCard({ divination }: { divination: DivinationView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <DivinationForm divination={divination} onClose={() => setEditing(false)} />
    );
  }

  const date = parseDateOnly(divination.date);
  const moon = date ? moonPhaseOfDay(date) : null;

  async function handleDelete() {
    const ok = await confirmAction({
      title: "Excluir esta tiragem?",
      description: "A leitura escrita aqui não volta.",
      destructive: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/api/divinations/${divination.id}`);
      router.refresh();
      notify("Excluída.");
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
            {divinationMethodLabels[divination.method] ?? divination.method}
            {divination.deck && ` · ${divination.deck}`}
            {divination.spread && ` · ${divination.spread}`}
          </p>
          <p className="text-sm font-semibold text-text-primary">
            {divination.question || "Sem pergunta"}
          </p>
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
        <span>{date ? formatDateLongBR(date) : divination.date}</span>
        {moon && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>{moonPhaseGlyph[moon.phase]}</span>
            {moonPhaseLabels[moon.phase]}
          </span>
        )}
      </p>

      {divination.cards.length > 0 && (
        <ol className="flex flex-col gap-1">
          {divination.cards.map((card, index) => (
            <li
              key={`${card}-${index}`}
              className="flex items-baseline gap-2 text-sm text-text-primary"
            >
              <span className="w-4 shrink-0 text-right text-xs text-text-secondary">
                {index + 1}
              </span>
              {card}
            </li>
          ))}
        </ol>
      )}

      {divination.reading && (
        <p className="whitespace-pre-wrap border-t border-border/60 pt-2 text-sm text-text-primary">
          {divination.reading}
        </p>
      )}

      {divination.outcome && (
        <div className="rounded-lg bg-hover p-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            O que se confirmou
          </p>
          <p className="whitespace-pre-wrap text-sm text-text-primary">
            {divination.outcome}
          </p>
        </div>
      )}
    </Card>
  );
}
