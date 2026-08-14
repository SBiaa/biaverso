"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatCurrencyBRL } from "@/lib/utils";
import type { UserSettingsValues } from "@/lib/settings-shared";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "Salvar",
  saving: "Salvando...",
  saved: "Salvo!",
  error: "Erro ao salvar",
};

const field =
  "w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

/**
 * Os dois números que a central de produtos usa em todo cálculo: quanto vale
 * uma hora sua (para os custos em minutos) e a margem que você quer.
 */
export function PricingSettingsForm({ initial }: { initial: UserSettingsValues }) {
  const router = useRouter();
  const [form, setForm] = useState({
    hourlyRate: initial.hourlyRate === null ? "" : String(initial.hourlyRate),
    targetMargin: String(initial.targetMargin),
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const rate = Number(form.hourlyRate) || 0;

  async function handleSave() {
    setSaveState("saving");
    setError(null);

    try {
      await api.patch("/api/settings", {
        // Em branco = "não defini": os custos por tempo passam a avisar em vez
        // de contar seu trabalho como zero.
        hourlyRate: form.hourlyRate,
        targetMargin: form.targetMargin,
      });
      router.refresh();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      setSaveState("error");
      setError(errorMessage(e));
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Produtos e preços</h2>
        <p className="text-xs text-text-secondary">
          Usado no cálculo de custo e no preço sugerido da central de produtos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-text-secondary">Valor da sua hora (R$)</p>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="não definido"
            value={form.hourlyRate}
            onChange={(e) => setForm((prev) => ({ ...prev, hourlyRate: e.target.value }))}
            className={field}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-text-secondary">Margem desejada (%)</p>
          <input
            type="number"
            min="0"
            max="99"
            step="1"
            value={form.targetMargin}
            onChange={(e) => setForm((prev) => ({ ...prev, targetMargin: e.target.value }))}
            className={field}
          />
        </div>
      </div>

      <p className="text-sm text-text-secondary">
        {rate > 0 ? (
          <>
            15 minutos de trabalho num produto custam{" "}
            <strong>{formatCurrencyBRL(rate / 4)}</strong>.
          </>
        ) : (
          "Sem valor por hora, os custos em minutos entram como R$0 e a margem fica otimista."
        )}
      </p>

      <ErrorNote message={error} />

      <Button onClick={handleSave} disabled={saveState === "saving"}>
        {SAVE_LABEL[saveState]}
      </Button>
    </Card>
  );
}
