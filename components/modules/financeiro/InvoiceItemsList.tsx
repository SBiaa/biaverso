"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Badge, Button, BusinessBadge, ErrorNote } from "@/components/ui";
import { BillAmountOverride } from "@/components/modules/financeiro/BillAmountOverride";
import { api, errorMessage } from "@/lib/client-api";
import { formatCurrencyBRL, formatDateBR, toDateInputValue } from "@/lib/utils";
import { fixedBillTypeLabels, transactionCategoryLabels } from "@/lib/labels";
import type { InvoiceItem } from "@/lib/finance";

const categoryOptions = Object.keys(transactionCategoryLabels);

type Business = { id: string; name: string; color: string };

function EditCreditCardEntryForm({
  item,
  invoiceMonth,
  invoiceYear,
  businesses,
  onClose,
}: {
  item: InvoiceItem;
  invoiceMonth: number;
  invoiceYear: number;
  businesses: Business[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: item.description,
    amount: String(item.amount),
    purchaseDate: toDateInputValue(item.date),
    invoiceMonth: String(invoiceMonth),
    invoiceYear: String(invoiceYear),
    installment: item.installment ?? "",
    category: item.category ?? categoryOptions[0],
    businessId: item.business?.id ?? "",
    notes: item.notes ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    setError(null);

    try {
      // Se for parcela, o servidor reajusta o total da compra na mesma transação.
      await api.patch(`/api/credit-card-entries/${item.id}`, {
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

/**
 * Fatura do mês numa lista só: compra avulsa, parcela e assinatura cobrada no
 * cartão. A assinatura não é um lançamento — ela vem da conta fixa, por isso
 * ganha o badge e leva para a tela de contas fixas em vez de abrir edição aqui.
 */
export function InvoiceItemsList({
  items,
  businesses,
  invoiceMonth,
  invoiceYear,
}: {
  items: InvoiceItem[];
  businesses: Business[];
  invoiceMonth: number;
  invoiceYear: number;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function handleDelete(item: InvoiceItem) {
    // Apagar uma parcela sozinha deixaria a compra sem bater com o total,
    // então parcela deleta a compra inteira.
    const message = item.purchaseId
      ? `"${item.description}" é uma compra parcelada. Deletar agora apaga TODAS as parcelas, em todas as faturas. Esta ação não pode ser desfeita.`
      : "Tem certeza que quer deletar este lançamento? Esta ação não pode ser desfeita.";
    if (!confirm(message)) return;

    setDeletingId(item.id);
    setListError(null);

    try {
      await api.delete(
        item.purchaseId
          ? `/api/credit-card-purchases/${item.purchaseId}`
          : `/api/credit-card-entries/${item.id}`,
      );
      router.refresh();
    } catch (e) {
      setListError(errorMessage(e));
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nada nesta fatura. Compras avulsas entram por aqui e assinaturas no
        cartão aparecem sozinhas quando a conta fixa está marcada como paga no
        cartão.
      </p>
    );
  }

  return (
    <>
      <ErrorNote message={listError} />
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) => {
          if (item.kind === "ASSINATURA") {
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Badge className="bg-badge-tarot-bg text-badge-tarot-text">
                    Assinatura
                  </Badge>
                  <div>
                    <p className="text-text-primary">{item.description}</p>
                    <p className="text-xs text-text-secondary">
                      vence dia {item.dueDay}
                      {item.fixedBillType
                        ? ` · ${fixedBillTypeLabels[item.fixedBillType]}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <BillAmountOverride
                    logId={item.id}
                    amount={item.amount}
                    defaultAmount={item.defaultAmount ?? item.amount}
                    amountOverride={item.amountOverride}
                  />
                  <Link
                    href="/financeiro/contas-fixas"
                    title="Editar a conta fixa"
                    className="text-text-secondary hover:text-text-primary"
                  >
                    <Pencil size={14} />
                  </Link>
                </div>
              </li>
            );
          }

          if (editingId === item.id) {
            return (
              <li key={item.id} className="py-2.5">
                <EditCreditCardEntryForm
                  item={item}
                  invoiceMonth={invoiceMonth}
                  invoiceYear={invoiceYear}
                  businesses={businesses}
                  onClose={() => setEditingId(null)}
                />
              </li>
            );
          }

          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <div className="flex items-center gap-3">
                <BusinessBadge business={item.business} />
                <div>
                  <p className="text-text-primary">{item.description}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDateBR(new Date(item.date))}
                    {item.category
                      ? ` · ${transactionCategoryLabels[item.category]}`
                      : ""}
                    {item.installment ? ` · parcela ${item.installment}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-text-primary">
                  {formatCurrencyBRL(item.amount)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => setEditingId(item.id)}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    title="Deletar"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
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
