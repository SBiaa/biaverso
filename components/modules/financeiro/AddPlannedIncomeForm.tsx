"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { transactionCategoryLabels } from "@/lib/labels";
import { utcDate } from "@/lib/finance-calc";

const categoryOptions = Object.keys(transactionCategoryLabels);

type Business = { id: string; name: string };

/**
 * Entrada prevista de um mês. É uma Transaction ENTRADA comum — o que a torna
 * "previsão" é só a data cair num mês que ainda não chegou.
 */
export function AddPlannedIncomeForm({
  businesses,
  month,
  year,
}: {
  businesses: Business[];
  month: number;
  year: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    day: "1",
    businessId: "",
    category: "RECEITA_VENDA",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.amount) return;
    setSaving(true);
    setError(null);

    // `utcDate` corta o dia no último do mês — dia 31 em setembro vira 30.
    const date = utcDate(year, month, Math.max(Number(form.day) || 1, 1));

    try {
      await api.post("/api/transactions", {
        name: form.name,
        type: "ENTRADA",
        amount: Number(form.amount),
        date: date.toISOString(),
        category: form.category,
        businessId: form.businessId || null,
        notes: form.notes || null,
        // Previsão: só entra no saldo depois de marcada como recebida.
        received: false,
      });
      setOpen(false);
      setForm((prev) => ({ ...prev, name: "", amount: "", notes: "" }));
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
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Adicionar entrada prevista
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <ErrorNote message={error} />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="De onde vem (ex: mensalidade Ana Lima)"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className="col-span-2 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Valor</span>
          <input
            type="number"
            step="0.01"
            placeholder="0,00"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Dia do mês</span>
          <input
            type="number"
            min={1}
            max={31}
            value={form.day}
            onChange={(e) => update("day", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <select
          value={form.businessId}
          onChange={(e) => update("businessId", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Pessoal/Casa</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {transactionCategoryLabels[c]}
            </option>
          ))}
        </select>
      </div>
      <input
        placeholder="Notas (opcional)"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <p className="text-xs text-text-secondary">
        Entra como previsão. Ela só soma no saldo do mês depois que você marcar
        que caiu na conta.
      </p>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
