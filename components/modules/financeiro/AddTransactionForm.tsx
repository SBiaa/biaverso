"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { payMethodLabels, transactionCategoryLabels } from "@/lib/labels";
import { toDateInputValue, todayInputValue } from "@/lib/utils";

const categoryOptions = Object.keys(transactionCategoryLabels);
const payMethodOptions = Object.keys(payMethodLabels);

type Business = { id: string; name: string };

type TransactionInitial = {
  id: string;
  name: string;
  type: string;
  amount: number;
  date: string | Date;
  businessId: string | null;
  category: string;
  payMethod: string | null;
  notes: string | null;
};

function emptyForm() {
  return {
    name: "",
    type: "SAIDA",
    amount: "",
    date: todayInputValue(),
    businessId: "",
    category: categoryOptions[0],
    payMethod: "",
    notes: "",
  };
}

function formFromTransaction(transaction: TransactionInitial) {
  return {
    name: transaction.name,
    type: transaction.type,
    amount: String(transaction.amount),
    date: toDateInputValue(transaction.date),
    businessId: transaction.businessId ?? "",
    category: transaction.category,
    payMethod: transaction.payMethod ?? "",
    notes: transaction.notes ?? "",
  };
}

export function AddTransactionForm({
  businesses,
  transaction,
  onClose,
}: {
  businesses: Business[];
  transaction?: TransactionInitial;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!transaction;
  const [open, setOpen] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(
    transaction ? formFromTransaction(transaction) : emptyForm(),
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function cancel() {
    setOpen(false);
    onClose?.();
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.amount) return;
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      businessId: form.businessId || null,
      payMethod: form.payMethod || null,
      amount: Number(form.amount),
      date: form.date,
    };

    try {
      if (isEdit) await api.patch(`/api/transactions/${transaction!.id}`, payload);
      else await api.post("/api/transactions", payload);
      setOpen(false);
      if (!isEdit) setForm((prev) => ({ ...prev, name: "", amount: "", notes: "" }));
      onClose?.();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Nova transação</Button>;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <ErrorNote message={error} />
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
        <Button variant="ghost" onClick={cancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
