"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, Modal, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatDateLongBR } from "@/lib/utils";
import type { CycleLogView } from "@/lib/ciclo-shared";
import { CycleLogFields, type CycleLogFormValue } from "./CycleLogFields";

export function DayLogModal({
  date,
  log,
  onClose,
}: {
  /** Data-calendário ISO do dia clicado. */
  date: string;
  log: CycleLogView | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState<CycleLogFormValue>({
    flow: log?.flow ?? null,
    symptoms: log?.symptoms ?? [],
    mood: log?.mood ?? null,
    notes: log?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: CycleLogFormValue) {
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/cycle-logs", {
        date,
        flow: next.flow,
        symptoms: next.symptoms,
        mood: next.mood,
        notes: next.notes || null,
      });
      router.refresh();
      notify("Salvo.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={formatDateLongBR(new Date(date))} onClose={onClose} onSubmit={() => save(value)}>
      <CycleLogFields value={value} onChange={setValue} />

      <ErrorNote message={error} />

      <div className="mt-2 flex gap-2">
        <Button type="submit" disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        {log && (
          <Button
            variant="danger"
            className="ml-auto"
            disabled={saving}
            onClick={() => save({ flow: null, symptoms: [], mood: null, notes: "" })}
          >
            Limpar dia
          </Button>
        )}
      </div>
    </Modal>
  );
}
