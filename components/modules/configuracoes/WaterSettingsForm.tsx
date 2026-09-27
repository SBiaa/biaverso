"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardTitle, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import type { UserSettingsValues } from "@/lib/settings-shared";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "Salvar",
  saving: "Salvando...",
  saved: "Salvo!",
  error: "Erro ao salvar",
};

export function WaterSettingsForm({ initial }: { initial: UserSettingsValues }) {
  const router = useRouter();
  const [form, setForm] = useState({
    waterGoal: String(initial.waterGoal),
    waterUnitMl: String(initial.waterUnitMl),
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Campo em branco durante a digitação não pode virar "0 × 0ml" no preview.
  const goal = Number(form.waterGoal) || 0;
  const unit = Number(form.waterUnitMl) || 0;

  async function handleSave() {
    setSaveState("saving");
    setError(null);

    try {
      await api.patch("/api/settings", {
        waterGoal: form.waterGoal,
        waterUnitMl: form.waterUnitMl,
      });
      router.refresh();
      notify("Salvo.");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      setSaveState("error");
      setError(errorMessage(e));
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Hidratação</CardTitle>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-text-secondary">Meta diária (garrafas/copos)</p>
          <input
            type="number"
            min="1"
            max="30"
            value={form.waterGoal}
            onChange={(e) => setForm((prev) => ({ ...prev, waterGoal: e.target.value }))}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-text-secondary">Volume por unidade (ml)</p>
          <input
            type="number"
            min="50"
            max="2000"
            step="50"
            value={form.waterUnitMl}
            onChange={(e) => setForm((prev) => ({ ...prev, waterUnitMl: e.target.value }))}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <p className="text-sm text-text-secondary">
        Meta: {goal} × {unit}ml = <strong>{goal * unit}ml</strong> por dia
      </p>

      <ErrorNote message={error} />

      <Button onClick={handleSave} disabled={saveState === "saving"}>
        {SAVE_LABEL[saveState]}
      </Button>
    </Card>
  );
}
