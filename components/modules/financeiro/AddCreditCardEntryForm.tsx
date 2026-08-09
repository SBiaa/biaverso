"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { transactionCategoryLabels } from "@/lib/labels";
import {
  addInvoiceMonths,
  invoiceForPurchase,
  splitInstallments,
} from "@/lib/finance-calc";
import {
  formatCurrencyBRL,
  formatMonthYearBR,
  monthNameBR,
  toDateInputValue,
} from "@/lib/utils";

const categoryOptions = Object.keys(transactionCategoryLabels);
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

type Business = { id: string; name: string };

function todayInputValue() {
  const d = new Date();
  return toDateInputValue(
    new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())),
  );
}

export function AddCreditCardEntryForm({
  businesses,
  closingDay,
  invoiceMonth,
  invoiceYear,
}: {
  businesses: Business[];
  closingDay: number | null;
  invoiceMonth: number;
  invoiceYear: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    purchaseDate: todayInputValue(),
    installments: "1",
    invoiceMonth: String(invoiceMonth),
    invoiceYear: String(invoiceYear),
    businessId: "",
    category: categoryOptions[0],
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Mexer na data da compra reposiciona a fatura sugerida.
  function updatePurchaseDate(value: string) {
    const invoice = invoiceForPurchase(new Date(value), closingDay);
    setForm((prev) => ({
      ...prev,
      purchaseDate: value,
      invoiceMonth: String(invoice.month),
      invoiceYear: String(invoice.year),
    }));
  }

  const installments = Math.max(1, Number(form.installments) || 1);
  const total = Number(form.amount) || 0;
  const preview =
    installments > 1 && total > 0
      ? {
          amounts: splitInstallments(total, installments),
          last: addInvoiceMonths(
            Number(form.invoiceMonth),
            Number(form.invoiceYear),
            installments - 1,
          ),
        }
      : null;

  async function handleSubmit() {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    await fetch("/api/credit-card-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        amount: total,
        purchaseDate: form.purchaseDate,
        invoiceMonth: Number(form.invoiceMonth),
        invoiceYear: Number(form.invoiceYear),
        installments,
        category: form.category,
        businessId: form.businessId || null,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    setOpen(false);
    setForm((prev) => ({
      ...prev,
      description: "",
      amount: "",
      installments: "1",
      notes: "",
    }));
    router.refresh();
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Nova compra</Button>;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Descrição"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className="col-span-2 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Valor total</span>
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
          <span className="text-xs text-text-secondary">Data da compra</span>
          <input
            type="date"
            value={form.purchaseDate}
            onChange={(e) => updatePurchaseDate(e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">
            Parcelas (1 = à vista)
          </span>
          <input
            type="number"
            min={1}
            max={72}
            value={form.installments}
            onChange={(e) => update("installments", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">
            {installments > 1 ? "Primeira parcela na fatura de" : "Fatura de"}
          </span>
          <div className="flex gap-2">
            <select
              value={form.invoiceMonth}
              onChange={(e) => update("invoiceMonth", e.target.value)}
              className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {monthNameBR(m)}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={form.invoiceYear}
              onChange={(e) => update("invoiceYear", e.target.value)}
              className="w-24 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
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

      {preview && (
        <p className="text-xs text-text-secondary">
          {installments}x de {formatCurrencyBRL(preview.amounts[1])}
          {preview.amounts[0] !== preview.amounts[1] &&
            ` (primeira de ${formatCurrencyBRL(preview.amounts[0])})`}
          {" · "}
          {formatMonthYearBR(
            Number(form.invoiceMonth),
            Number(form.invoiceYear),
          )}{" "}
          até {formatMonthYearBR(preview.last.month, preview.last.year)}
        </p>
      )}

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
