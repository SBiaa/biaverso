"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { payMethodLabels, transactionCategoryLabels } from "@/lib/labels";

const categoryOptions = Object.keys(transactionCategoryLabels);
const payMethodOptions = Object.keys(payMethodLabels);

type Business = { id: string; name: string };

function todayInputValue() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function AddTransactionForm({ businesses }: { businesses: Business[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "SAIDA",
    amount: "",
    date: todayInputValue(),
    businessId: "",
    category: categoryOptions[0],
    payMethod: "",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.amount) return;
    setSaving(true);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        businessId: form.businessId || null,
        amount: Number(form.amount),
        date: new Date(form.date).toISOString(),
      }),
    });
    setSaving(false);
    setOpen(false);
    setForm((prev) => ({ ...prev, name: "", amount: "", notes: "" }));
    router.refresh();
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Nova transação</Button>;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Nome"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className="col-span-2 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <select
          value={form.type}
          onChange={(e) => update("type", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="ENTRADA">Entrada</option>
          <option value="SAIDA">Saída</option>
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="Valor"
          value={form.amount}
          onChange={(e) => update("amount", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => update("date", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
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
        <select
          value={form.payMethod}
          onChange={(e) => update("payMethod", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Forma de pagamento</option>
          {payMethodOptions.map((p) => (
            <option key={p} value={p}>
              {payMethodLabels[p]}
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
