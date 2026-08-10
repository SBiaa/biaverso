"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button, BusinessBadge, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import {
  formatCurrencyBRL,
  formatDateBR,
  toDateInputValue,
} from "@/lib/utils";
import { transactionCategoryLabels } from "@/lib/labels";

const categoryOptions = Object.keys(transactionCategoryLabels);

type Business = { id: string; name: string; color: string };

type CreditCardEntry = {
  id: string;
  description: string;
  amount: number;
  purchaseDate: string | Date;
  invoiceMonth: number;
  invoiceYear: number;
  installment: string | null;
  category: string;
  businessId: string | null;
  business: Business | null;
  purchaseId: string | null;
  notes: string | null;
};

function formFromEntry(entry: CreditCardEntry) {
  return {
    description: entry.description,
    amount: String(entry.amount),
    purchaseDate: toDateInputValue(entry.purchaseDate),
    invoiceMonth: String(entry.invoiceMonth),
    invoiceYear: String(entry.invoiceYear),
    installment: entry.installment ?? "",
    category: entry.category,
    businessId: entry.businessId ?? "",
    notes: entry.notes ?? "",
  };
}

function EditCreditCardEntryForm({
  entry,
  businesses,
  onClose,
}: {
  entry: CreditCardEntry;
  businesses: Business[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(formFromEntry(entry));

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    setError(null);

    try {
      // Se for parcela, o servidor reajusta o total da compra na mesma transação.
      await api.patch(`/api/credit-card-entries/${entry.id}`, {
        ...form,
        amount: Number(form.amount),
        invoiceMonth: Number(form.invoiceMonth),
        invoiceYear: Number(form.invoiceYear),
        businessId: form.businessId || null,
      });
      onClose();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <ErrorNote message={error} />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Descrição"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className="col-span-2 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
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
          value={form.purchaseDate}
          onChange={(e) => update("purchaseDate", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          type="number"
          min={1}
          max={12}
          placeholder="Mês da fatura"
          value={form.invoiceMonth}
          onChange={(e) => update("invoiceMonth", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          type="number"
          placeholder="Ano da fatura"
          value={form.invoiceYear}
          onChange={(e) => update("invoiceYear", e.target.value)}
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
        <input
          placeholder="Parcela (opcional)"
          value={form.installment}
          onChange={(e) => update("installment", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
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
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function CreditCardEntriesList({
  entries,
  businesses,
}: {
  entries: CreditCardEntry[];
  businesses: Business[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function handleDelete(entry: CreditCardEntry) {
    // Apagar uma parcela sozinha deixaria a compra sem bater com o total,
    // então parcela deleta a compra inteira.
    const message = entry.purchaseId
      ? `"${entry.description}" é uma compra parcelada. Deletar agora apaga TODAS as parcelas, em todas as faturas. Esta ação não pode ser desfeita.`
      : "Tem certeza que quer deletar este lançamento? Esta ação não pode ser desfeita.";
    if (!confirm(message)) return;

    setDeletingId(entry.id);
    setListError(null);

    try {
      await api.delete(
        entry.purchaseId
          ? `/api/credit-card-purchases/${entry.purchaseId}`
          : `/api/credit-card-entries/${entry.id}`,
      );
      router.refresh();
    } catch (e) {
      setListError(errorMessage(e));
      setDeletingId(null);
    }
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhum lançamento neste mês.
      </p>
    );
  }

  return (
    <>
      <ErrorNote message={listError} />
    <ul className="flex flex-col divide-y divide-border">
      {entries.map((entry) => {
        if (editingId === entry.id) {
          return (
            <li key={entry.id} className="py-2.5">
              <EditCreditCardEntryForm
                entry={entry}
                businesses={businesses}
                onClose={() => setEditingId(null)}
              />
            </li>
          );
        }

        return (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-3 py-2.5 text-sm"
          >
            <div className="flex items-center gap-3">
              <BusinessBadge business={entry.business} />
              <div>
                <p className="text-text-primary">{entry.description}</p>
                <p className="text-xs text-text-secondary">
                  {formatDateBR(new Date(entry.purchaseDate))} ·{" "}
                  {transactionCategoryLabels[entry.category]}
                  {entry.installment ? ` · parcela ${entry.installment}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-text-primary">
                {formatCurrencyBRL(entry.amount)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Editar"
                  onClick={() => setEditingId(entry.id)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  title="Deletar"
                  onClick={() => handleDelete(entry)}
                  disabled={deletingId === entry.id}
                  className="text-text-secondary hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
    </>
  );
}
