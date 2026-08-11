"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { careTypeLabels } from "@/lib/labels";
import { cn, formatDateBR } from "@/lib/utils";
import type { AppointmentView } from "@/lib/beleza-shared";
import { AppointmentDoneModal } from "./AppointmentDoneModal";
import { UrgencyPill, urgencyBorder } from "./shared";

/** Cuidados agendados ordenados por vencimento — atrasados em vermelho no topo. */
export function PendingAppointments({
  appointments,
}: {
  appointments: AppointmentView[];
}) {
  const [doneTarget, setDoneTarget] = useState<AppointmentView | null>(null);

  if (appointments.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhum cuidado agendado.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2",
              urgencyBorder[appointment.urgency],
            )}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-text-primary">
                  {appointment.name}
                </p>
                <Badge>{careTypeLabels[appointment.type]}</Badge>
              </div>
              <p className="text-xs text-text-secondary">
                {appointment.nextDueAt
                  ? `Próxima: ${formatDateBR(new Date(appointment.nextDueAt))}`
                  : "Ainda não foi feito nenhuma vez"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <UrgencyPill
                urgency={appointment.urgency}
                days={appointment.daysUntilDue}
              />
              <Button
                variant="secondary"
                onClick={() => setDoneTarget(appointment)}
                className="px-2.5 py-1 text-xs"
              >
                <Check size={13} />
                Feito
              </Button>
            </div>
          </div>
        ))}
      </div>

      {doneTarget && (
        <AppointmentDoneModal
          appointmentId={doneTarget.id}
          name={doneTarget.name}
          onClose={() => setDoneTarget(null)}
        />
      )}
    </>
  );
}
