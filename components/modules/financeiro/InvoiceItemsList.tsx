"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  BusinessBadge,
  Button,
  confirmAction,
  ErrorNote,
  Field,
  fieldClass,
  IconButton,
  Modal,
  ModalActions,
  notify,
} from "@/components/ui";
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
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Editar compra no cartão" onClose={onClose} onSubmit={handleSubmit} size="md">
      <Field label="Descrição">
        <input
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className={fieldClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Data da compra">
          <input
            type="date"
            value={form.purchaseDate}
            onChange={(e) => update("purchaseDate", e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Mês da fatura">
          <input
            type="number"
            min={1}
            max={12}
            value={form.invoiceMonth}
            onChange={(e) => update("invoiceMonth", e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Ano da fatura">
          <input
            type="number"
            value={form.invoiceYear}
            onChange={(e) => update("invoiceYear", e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="De quem é">
          <select
            value={form.businessId}
            onChange={(e) => update("businessId", e.target.value)}
            className={fieldClass}
          >
            <option value="">Pessoal/Casa</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Categoria">
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className={fieldClass}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {transactionCategoryLabels[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Parcela (opcional)">
          <input
            placeholder="Ex.: 2/6"
            value={form.installment}
            onChange={(e) => update("installment", e.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>
      <Field label="Notas (opcional)">
        <input
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className={fieldClass}
        />
      </Field>
      <ErrorNote message={error} />
      <ModalActions>
        <Button type="submit" disabled={saving || !form.description.trim() || !form.amount}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </ModalActions>
    </Modal>
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
  const editingItem = items.find((i) => i.id === editingId) ?? null;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function handleDelete(item: InvoiceItem) {
    // Apagar uma parcela sozinha deixaria a compra sem bater com o total,
    // então parcela deleta a compra inteira.
    const message = item.purchaseId
      ? `"${item.description}" é uma compra parcelada. Deletar agora apaga TODAS as parcelas, em todas as faturas. Esta ação não pode ser desfeita.`
      : "Tem certeza que quer deletar este lançamento? Esta ação não pode ser desfeita.";
    const confirmed = await confirmAction({
      title: message,
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingId(item.id);
    setListError(null);

    try {
      await api.delete(
        item.purchaseId
          ? `/api/credit-card-purchases/${item.purchaseId}`
          : `/api/credit-card-entries/${item.id}`,
      );
      router.refresh();
      notify("Excluído.");
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
          // As duas linhas quebram em duas no celular: descrição em cima, valor
          // e ações embaixo. Numa linha só, o valor saía da tela de 375px.
          if (item.kind === "ASSINATURA") {
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Badge className="bg-badge-tarot-bg text-badge-tarot-text">
                    Assinatura
                  </Badge>
                  <div className="min-w-0">
                    <p className="break-words text-text-primary">{item.description}</p>
                    <p className="text-xs text-text-secondary">
                      vence dia {item.dueDay}
                      {item.fixedBillType
                        ? ` · ${fixedBillTypeLabels[item.fixedBillType]}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-3">
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

          return (
            <li
              key={item.id}
              className="flex flex-col gap-2 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <BusinessBadge business={item.business} />
                <div className="min-w-0">
                  <p className="break-words text-text-primary">{item.description}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDateBR(new Date(item.date))}
                    {item.category
                      ? ` · ${transactionCategoryLabels[item.category]}`
                      : ""}
                    {item.installment ? ` · parcela ${item.installment}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-3">
                <span className="font-medium text-text-primary">
                  {formatCurrencyBRL(item.amount)}
                </span>
                <div className="flex items-center gap-1">
                  <IconButton
                    title="Editar"
                    onClick={() => setEditingId(item.id)}
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    title="Deletar"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    tone="danger"
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {editingItem && (
        <EditCreditCardEntryForm
          item={editingItem}
          invoiceMonth={invoiceMonth}
          invoiceYear={invoiceYear}
          businesses={businesses}
          onClose={() => setEditingId(null)}
        />
      )}
    </>
  );
}
