"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatCurrencyBRL } from "@/lib/utils";

/**
 * Ajuste do valor de uma conta fixa só naquele mês (reajuste, consumo variável).
 * Some do banco quando volta a valer o padrão, então o histórico não fica cheio
 * de "ajuste" que só repete o valor da conta.
 */
export function BillAmountOverride({
  logId,
  amount,
  defaultAmount,
  amountOverride,
}: {
  logId: string;
  amount: number;
  defaultAmount: number;
  amountOverride: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(String(amountOverride ?? defaultAmount));

  async function save(next: number | null) {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/fixed-bill-logs/${logId}`, { amountOverride: next });
      setOpen(false);
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        title="Ajustar o valor só deste mês"
        onClick={() => {
          setValue(String(amountOverride ?? defaultAmount));
          setOpen(true);
        }}
        className={cn(
          "flex items-center gap-1 font-medium text-text-primary hover:text-accent",
          amountOverride !== null && "text-accent",
        )}
      >
        {formatCurrencyBRL(amount)}
        <Pencil size={12} className="opacity-60" />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ErrorNote message={error} />
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 rounded-md border border-border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="button"
          onClick={() => save(Number(value))}
          disabled={saving || !value}
          className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          Cancelar
        </button>
      </div>
      {amountOverride !== null && (
        <button
          type="button"
          onClick={() => save(null)}
          disabled={saving}
          className="text-xs text-text-secondary underline hover:text-text-primary"
        >
          voltar ao padrão ({formatCurrencyBRL(defaultAmount)})
        </button>
      )}
    </div>
  );
}
