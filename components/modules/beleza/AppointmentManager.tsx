"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  confirmAction,
  ErrorNote,
  IconButton,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { careTypeLabels } from "@/lib/labels";
import { cn, formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import type { AppointmentView } from "@/lib/beleza-shared";
import { AppointmentDoneModal } from "./AppointmentDoneModal";
import { AppointmentFormModal } from "./AppointmentFormModal";
import { UrgencyPill, urgencyBorder } from "./shared";

function AppointmentCard({
  appointment,
  onError,
}: {
  appointment: AppointmentView;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [marking, setMarking] = useState(false);

  async function handleDelete() {
    const confirmed = await confirmAction({
      title: `Deletar "${appointment.name}"?`,
      description: `O histórico de datas e custos vai junto. Os lançamentos já feitos no financeiro ficam.`,
      destructive: true,
    });
    if (!confirmed) return;

    onError(null);
    try {
      await api.delete(`/api/beauty/appointments/${appointment.id}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      onError(errorMessage(e));
    }
  }

  return (
    <>
      <Card
        className={cn(
          "flex flex-col gap-2",
          urgencyBorder[appointment.urgency],
          !appointment.active && "opacity-60",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-text-primary">
                {appointment.name}
              </p>
              <Badge>{careTypeLabels[appointment.type]}</Badge>
              {!appointment.active && <Badge>Inativo</Badge>}
            </div>
            <p className="text-xs text-text-secondary">
              A cada {appointment.intervalDays}{" "}
              {appointment.intervalDays === 1 ? "dia" : "dias"}
              {appointment.lastDoneAt &&
                ` · última vez ${formatDateBR(new Date(appointment.lastDoneAt))}`}
            </p>
            <p className="text-xs text-text-secondary">
              {appointment.nextDueAt
                ? `Próxima: ${formatDateBR(new Date(appointment.nextDueAt))}`
                : "Ainda não foi feito nenhuma vez"}
            </p>
            {appointment.notes && (
              <p className="mt-1 text-xs text-text-secondary">{appointment.notes}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <UrgencyPill urgency={appointment.urgency} days={appointment.daysUntilDue} />
            <div className="flex items-center gap-2">
              <IconButton
                title="Editar"
                onClick={() => setEditing(true)}
              >
                <Pencil size={15} />
              </IconButton>
              <IconButton
                title="Deletar"
                onClick={handleDelete}
                tone="danger"
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Histórico ({appointment.history.length})
          </button>

          <Button
            variant="secondary"
            onClick={() => setMarking(true)}
            className="px-3 py-1 text-xs"
          >
            <Check size={13} />
            Marcar como feito
          </Button>
        </div>

        {open && (
          <div className="border-t border-border pt-2">
            {appointment.history.length === 0 ? (
              <p className="text-sm text-text-secondary">Nada registrado ainda.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {appointment.history.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-baseline justify-between gap-2 text-sm"
                  >
                    <span className="text-text-primary">
                      {formatDateBR(new Date(entry.date))}
                      {entry.notes && (
                        <span className="text-text-secondary"> · {entry.notes}</span>
                      )}
                    </span>
                    {entry.cost !== null && (
                      <span className="shrink-0 text-xs font-medium text-text-primary">
                        {formatCurrencyBRL(entry.cost)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {editing && (
        <AppointmentFormModal
          appointment={appointment}
          onClose={() => setEditing(false)}
        />
      )}

      {marking && (
        <AppointmentDoneModal
          appointmentId={appointment.id}
          name={appointment.name}
          onClose={() => setMarking(false)}
        />
      )}
    </>
  );
}

export function AppointmentManager({
  appointments,
}: {
  appointments: AppointmentView[];
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <ErrorNote message={error} />

      {appointments.length === 0 && (
        <p className="text-sm text-text-secondary">
          Nenhum cuidado cadastrado.
        </p>
      )}

      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onError={setError}
        />
      ))}

      <Button className="self-start" onClick={() => setCreating(true)}>
        <Plus size={14} />
        Novo cuidado
      </Button>

      {creating && <AppointmentFormModal onClose={() => setCreating(false)} />}
    </div>
  );
}
