"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ErrorNote,
  Field,
  fieldClass,
  Modal,
  ModalActions,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
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
  todayInputValue,
} from "@/lib/utils";

const categoryOptions = Object.keys(transactionCategoryLabels);
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

type Business = { id: string; name: string };

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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);

    try {
      await api.post("/api/credit-card-entries", {
        description: form.description,
        amount: total,
        purchaseDate: form.purchaseDate,
        invoiceMonth: Number(form.invoiceMonth),
        invoiceYear: Number(form.invoiceYear),
        installments,
        category: form.category,
        businessId: form.businessId || null,
        notes: form.notes || null,
      });
      setOpen(false);
      setForm((prev) => ({
        ...prev,
        description: "",
        amount: "",
        installments: "1",
        notes: "",
      }));
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Nova compra</Button>
      {open && (
        <Modal
          title="Nova compra no cartão"
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit}
          size="md"
        >
          <Field label="Descrição">
            <input
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor total (R$)">
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Data da compra">
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => updatePurchaseDate(e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Parcelas (1 = à vista)">
              <input
                type="number"
                min={1}
                max={72}
                value={form.installments}
                onChange={(e) => update("installments", e.target.value)}
                className={fieldClass}
              />
            </Field>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">
                {installments > 1 ? "Primeira parcela na fatura de" : "Fatura de"}
              </span>
              <div className="flex gap-2">
                <select
                  value={form.invoiceMonth}
                  onChange={(e) => update("invoiceMonth", e.target.value)}
                  aria-label="Mês da fatura"
                  className={fieldClass}
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
                  aria-label="Ano da fatura"
                  className={`${fieldClass} w-24! shrink-0`}
                />
              </div>
            </div>
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
          </div>
          <Field label="Notas (opcional)">
            <input
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className={fieldClass}
            />
          </Field>

          {preview && (
            <p className="text-xs text-text-secondary">
              {installments}x de {formatCurrencyBRL(preview.amounts[1])}
              {preview.amounts[0] !== preview.amounts[1] &&
                ` (primeira de ${formatCurrencyBRL(preview.amounts[0])})`}
              {" · "}
              {formatMonthYearBR(Number(form.invoiceMonth), Number(form.invoiceYear))} até{" "}
              {formatMonthYearBR(preview.last.month, preview.last.year)}
            </p>
          )}

          <ErrorNote message={error} />
          <ModalActions>
            <Button
              type="submit"
              disabled={saving || !form.description.trim() || !form.amount}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </ModalActions>
        </Modal>
      )}
    </>
  );
}
