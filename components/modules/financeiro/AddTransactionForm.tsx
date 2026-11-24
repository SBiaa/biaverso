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
  received?: boolean;
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
    received: true,
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
    received: transaction.received ?? true,
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
      // "Caiu na conta" só existe para entrada; saída nasce sempre marcada.
      received: form.type === "ENTRADA" ? form.received : true,
    };

    try {
      if (isEdit) await api.patch(`/api/transactions/${transaction!.id}`, payload);
      else await api.post("/api/transactions", payload);
      setOpen(false);
      if (!isEdit) setForm((prev) => ({ ...prev, name: "", amount: "", notes: "" }));
      onClose?.();
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const modal = open && (
    <Modal
      title={isEdit ? "Editar transação" : "Nova transação"}
      onClose={cancel}
      onSubmit={handleSubmit}
      size="md"
    >
      <Field label="Nome">
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Ex.: Mercado"
          className={fieldClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select
            value={form.type}
            onChange={(e) => update("type", e.target.value)}
            className={fieldClass}
          >
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
          </select>
        </Field>
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
        <Field label="Data">
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
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
        <Field label="Forma de pagamento">
          <select
            value={form.payMethod}
            onChange={(e) => update("payMethod", e.target.value)}
            className={fieldClass}
          >
            <option value="">—</option>
            {payMethodOptions.map((p) => (
              <option key={p} value={p}>
                {payMethodLabels[p]}
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
      {form.type === "ENTRADA" && (
        <label className="flex items-start gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={form.received}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, received: e.target.checked }))
            }
            className="mt-0.5"
          />
          <span>
            Já caiu na conta
            <span className="block text-xs text-text-secondary">
              Desmarque se ainda é só previsão — aí ela não soma no saldo do mês.
            </span>
          </span>
        </label>
      )}
      <ErrorNote message={error} />
      <ModalActions>
        <Button type="submit" disabled={saving || !form.name.trim() || !form.amount}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="ghost" onClick={cancel}>
          Cancelar
        </Button>
      </ModalActions>
    </Modal>
  );

  // Editando, quem chama já tem o próprio botão: aqui só entra o modal.
  if (isEdit) return modal;

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Nova transação</Button>
      {modal}
    </>
  );
}
