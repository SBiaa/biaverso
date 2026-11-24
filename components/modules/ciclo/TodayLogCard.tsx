"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardTitle, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatDateLongBR } from "@/lib/utils";
import type { CycleLogView } from "@/lib/ciclo-shared";
import { CycleLogFields, type CycleLogFormValue } from "./CycleLogFields";

function toFormValue(log: CycleLogView | null): CycleLogFormValue {
  return {
    flow: log?.flow ?? null,
    symptoms: log?.symptoms ?? [],
    mood: log?.mood ?? null,
    notes: log?.notes ?? "",
  };
}

export function TodayLogCard({
  date,
  log,
}: {
  /** Data-calendário ISO de hoje. */
  date: string;
  log: CycleLogView | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(() => toFormValue(log));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/cycle-logs", {
        date,
        flow: value.flow,
        symptoms: value.symptoms,
        mood: value.mood,
        notes: value.notes || null,
      });
      router.refresh();
      notify("Registro de hoje salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardTitle className="mb-1">Hoje</CardTitle>
      <p className="mb-3 text-xs text-text-secondary">{formatDateLongBR(new Date(date))}</p>

      <CycleLogFields value={value} onChange={setValue} />

      <ErrorNote message={error} />

      <div className="mt-3 flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          Salvar
        </Button>
        {(value.flow || value.symptoms.length > 0 || value.mood || value.notes) && (
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => setValue({ flow: null, symptoms: [], mood: null, notes: "" })}
          >
            Limpar
          </Button>
        )}
      </div>
    </Card>
  );
}
