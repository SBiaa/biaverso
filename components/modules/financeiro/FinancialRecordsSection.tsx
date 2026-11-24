"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  confirmAction,
  ErrorNote,
  Field,
  fieldClass,
  IconButton,
  Modal,
  ModalActions,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import { financialStatusLabels } from "@/lib/labels";

type FinancialRecordItem = {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  status: "EM_ABERTO" | "PARCIAL" | "QUITADO";
  installments: number | null;
  dueDay: number | null;
  notes: string | null;
};

type FinancialRecordsSectionProps = {
  type: "DIVIDA" | "INVESTIMENTO";
  initialRecords: FinancialRecordItem[];
};

const statusStyles: Record<string, string> = {
  EM_ABERTO: "bg-badge-ace-bg text-badge-ace-text",
  PARCIAL: "bg-badge-casa-bg text-badge-casa-text",
  QUITADO: "bg-badge-creative-bg text-badge-creative-text",
};

/** Criar ou editar uma dívida/investimento, no mesmo modal do resto do app. */
function RecordFormModal({
  record,
  type,
  onSaved,
  onClose,
}: {
  record?: FinancialRecordItem;
  type: "DIVIDA" | "INVESTIMENTO";
  onSaved: (record: FinancialRecordItem, isNew: boolean) => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: record?.name ?? "",
    totalAmount: record ? String(record.totalAmount) : "",
    paidAmount: record ? String(record.paidAmount) : "",
    installments: record?.installments ? String(record.installments) : "",
    dueDay: record?.dueDay ? String(record.dueDay) : "",
    notes: record?.notes ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.totalAmount) return;
    setSaving(true);
    setError(null);

    const base = {
      name: form.name,
      totalAmount: Number(form.totalAmount),
      installments: form.installments ? Number(form.installments) : null,
      dueDay: form.dueDay ? Number(form.dueDay) : null,
      notes: form.notes || null,
    };

    try {
      const saved = record
        ? await api.patch<FinancialRecordItem>(`/api/financial-records/${record.id}`, {
            ...base,
            paidAmount: form.paidAmount ? Number(form.paidAmount) : 0,
          })
        : await api.post<FinancialRecordItem>("/api/financial-records", { ...base, type });
      onSaved(saved, !record);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const noun = type === "DIVIDA" ? "dívida" : "investimento";
  const title = record
    ? `Editar ${noun}`
    : type === "DIVIDA"
      ? "Nova dívida"
      : "Novo investimento";

  return (
    <Modal title={title} onClose={onClose} onSubmit={handleSubmit} size="md">
      <Field label="Nome">
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className={fieldClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor total (R$)">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.totalAmount}
            onChange={(e) => update("totalAmount", e.target.value)}
            className={fieldClass}
          />
        </Field>
        {record && (
          <Field label={type === "DIVIDA" ? "Já pago (R$)" : "Já aportado (R$)"}>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.paidAmount}
              onChange={(e) => update("paidAmount", e.target.value)}
              className={fieldClass}
            />
          </Field>
        )}
        {type === "DIVIDA" && (
          <>
            <Field label="Parcelas">
              <input
                type="number"
                min={1}
                value={form.installments}
                onChange={(e) => update("installments", e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Dia de vencimento">
              <input
                type="number"
                min={1}
                max={31}
                value={form.dueDay}
                onChange={(e) => update("dueDay", e.target.value)}
                className={fieldClass}
              />
            </Field>
          </>
        )}
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
        <Button type="submit" disabled={saving || !form.name.trim() || !form.totalAmount}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </ModalActions>
    </Modal>
  );
}

export function FinancialRecordsSection({
  type,
  initialRecords,
}: FinancialRecordsSectionProps) {
  const [records, setRecords] = useState(initialRecords);
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const paymentLabel = type === "DIVIDA" ? "Registrar pagamento" : "Registrar aporte";

  async function submitPayment(id: string) {
    const value = Number(paymentInputs[id]);
    if (!value || value <= 0) return;
    setListError(null);

    try {
      // O servidor recalcula saldo e status, então a lista usa a resposta dele.
      const updated = await api.patch<FinancialRecordItem>(`/api/financial-records/${id}`, {
        payment: value,
      });
      setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setPaymentInputs((prev) => ({ ...prev, [id]: "" }));
    } catch (e) {
      setListError(errorMessage(e));
    }
  }

  async function handleDelete(id: string) {
    const label = type === "DIVIDA" ? "esta dívida" : "este investimento";
    const confirmed = await confirmAction({
      title: `Tem certeza que quer deletar ${label}?`,
      description: `Esta ação não pode ser desfeita.`,
      destructive: true,
    });
    if (!confirmed) return;
    setDeletingId(id);
    setListError(null);

    try {
      await api.delete(`/api/financial-records/${id}`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setListError(errorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }

  function handleSaved(saved: FinancialRecordItem, isNew: boolean) {
    setRecords((prev) =>
      isNew ? [...prev, saved] : prev.map((r) => (r.id === saved.id ? saved : r)),
    );
  }

  const editingRecord = records.find((r) => r.id === editingId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <ErrorNote message={listError} />

      {records.length === 0 && (
        <p className="text-sm text-text-secondary">Nenhum registro ainda.</p>
      )}

      {records.map((record) => {
        const progress =
          record.totalAmount === 0
            ? 0
            : Math.min(100, Math.round((record.paidAmount / record.totalAmount) * 100));

        return (
          <Card key={record.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {record.name}
                </p>
                {record.notes && (
                  <p className="text-xs text-text-secondary">{record.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    statusStyles[record.status],
                  )}
                >
                  {financialStatusLabels[record.status]}
                </span>
                <div className="flex items-center gap-1">
                  <IconButton
                    title="Editar"
                    onClick={() => setEditingId(record.id)}
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    title="Deletar"
                    onClick={() => handleDelete(record.id)}
                    disabled={deletingId === record.id}
                    tone="danger"
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                {formatCurrencyBRL(record.paidAmount)} de{" "}
                {formatCurrencyBRL(record.totalAmount)}
              </span>
              <span className="text-text-secondary">{progress}%</span>
            </div>

            {record.status !== "QUITADO" && (
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor"
                  value={paymentInputs[record.id] ?? ""}
                  onChange={(e) =>
                    setPaymentInputs((prev) => ({
                      ...prev,
                      [record.id]: e.target.value,
                    }))
                  }
                  className="w-32 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
                <Button variant="secondary" onClick={() => submitPayment(record.id)}>
                  {paymentLabel}
                </Button>
              </div>
            )}
          </Card>
        );
      })}

      <Button variant="secondary" className="self-start" onClick={() => setShowForm(true)}>
        + {type === "DIVIDA" ? "Nova dívida" : "Novo investimento"}
      </Button>
      {showForm && (
        <RecordFormModal type={type} onSaved={handleSaved} onClose={() => setShowForm(false)} />
      )}
      {editingRecord && (
        <RecordFormModal
          record={editingRecord}
          type={type}
          onSaved={handleSaved}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
