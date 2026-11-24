"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { careTypeLabels } from "@/lib/labels";
import type { CareUrgency } from "@/lib/beleza-shared";
import { AppointmentDoneModal } from "./AppointmentDoneModal";
import { UrgencyPill } from "./shared";

export type DueCareItem = {
  id: string;
  name: string;
  type: string;
  urgency: CareUrgency;
  daysUntilDue: number | null;
};

/**
 * Cuidados que venceram para o dia mostrado — a parte de beleza que aparece no
 * /dia. Inclui os atrasados: um cuidado esquecido não pode sumir da tela do dia
 * só porque a data já passou.
 */
export function DueCareToday({ items }: { items: DueCareItem[] }) {
  const [doneTarget, setDoneTarget] = useState<DueCareItem | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          Cuidados de hoje
        </p>

        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-text-primary">{item.name}</p>
              <Badge>Beleza</Badge>
              <span className="text-xs text-text-secondary">
                {careTypeLabels[item.type]}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <UrgencyPill urgency={item.urgency} days={item.daysUntilDue} />
              <Button
                variant="secondary"
                onClick={() => setDoneTarget(item)}
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
