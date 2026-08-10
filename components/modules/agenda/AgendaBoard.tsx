"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { eventCategoryLabels } from "@/lib/labels";
import { cn, formatDateLongBR, parseDateOnly, todayInputValue } from "@/lib/utils";
import { groupEventsByDate, type AgendaEvent } from "@/lib/agenda-shared";
import { EventForm } from "./EventForm";
import { SyncStatusIcon } from "./SyncStatusIcon";

function EventRow({
  event,
  onEdit,
  onDelete,
  deleting,
}: {
  event: AgendaEvent;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <li className="flex items-start gap-3 py-2 text-sm">
      <span className="w-24 shrink-0 text-text-secondary">
        {event.allDay || !event.time
          ? "Dia inteiro"
          : event.endTime
            ? `${event.time}–${event.endTime}`
            : event.time}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <SyncStatusIcon status={event.syncStatus} />
          <span className="truncate text-text-primary">{event.title}</span>
        </div>
        {event.description && (
          <span className="truncate text-xs text-text-secondary">
            {event.description}
          </span>
        )}
      </div>

      <Badge className="shrink-0">
        {eventCategoryLabels[event.category] ?? event.category}
      </Badge>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${event.title}`}
          className="rounded p-1 text-text-secondary hover:bg-black/[0.03]"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Excluir ${event.title}`}
          className="rounded p-1 text-text-secondary hover:bg-black/[0.03] disabled:opacity-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

export function AgendaBoard({ initialEvents }: { initialEvents: AgendaEvent[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = todayInputValue();
  const groups = groupEventsByDate(initialEvents);

  async function handleDelete(event: AgendaEvent) {
    if (!confirm(`Excluir "${event.title}"?`)) return;

    setDeletingId(event.id);
    setError(null);
    try {
      await api.delete(`/api/events/${event.id}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <EventForm />

      {error && <p className="text-xs text-red-600">{error}</p>}

      {groups.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">
            Nenhum evento na agenda. Crie um evento ou sincronize com o Google
            Calendar.
          </p>
        </Card>
      ) : (
        groups.map((group) => (
          <Card key={group.date}>
            <h2
              className={cn(
                "mb-2 text-sm font-semibold",
                group.date === today ? "text-accent" : "text-text-primary",
              )}
            >
              {formatDateLongBR(parseDateOnly(group.date)!)}
              {group.date === today && " · hoje"}
            </h2>

            <ul className="divide-y divide-border">
              {group.items.map((event) =>
                editingId === event.id ? (
                  <li key={event.id} className="py-2">
                    <EventForm event={event} onClose={() => setEditingId(null)} />
                  </li>
                ) : (
                  <EventRow
                    key={event.id}
                    event={event}
                    onEdit={() => setEditingId(event.id)}
                    onDelete={() => handleDelete(event)}
                    deleting={deletingId === event.id}
                  />
                ),
              )}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
