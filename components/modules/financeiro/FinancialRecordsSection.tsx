"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, Button } from "@/components/ui";
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

function EditRecordForm({
  record,
  type,
  onSaved,
  onClose,
}: {
  record: FinancialRecordItem;
  type: "DIVIDA" | "INVESTIMENTO";
  onSaved: (record: FinancialRecordItem) => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: record.name,
    totalAmount: String(record.totalAmount),
    paidAmount: String(record.paidAmount),
    installments: record.installments ? String(record.installments) : "",
    dueDay: record.dueDay ? String(record.dueDay) : "",
    notes: record.notes ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.totalAmount) return;
    setSaving(true);
    const response = await fetch(`/api/financial-records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        totalAmount: Number(form.totalAmount),
        paidAmount: form.paidAmount ? Number(form.paidAmount) : 0,
        installments: form.installments ? Number(form.installments) : null,
        dueDay: form.dueDay ? Number(form.dueDay) : null,
        notes: form.notes || null,
      }),
    });
    const updated = await response.json();
    setSaving(false);
    onSaved(updated);
    onClose();
  }

  return (
    <Card className="flex flex-col gap-2">
      <input
        placeholder="Nome"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          placeholder="Valor total"
          value={form.totalAmount}
          onChange={(e) => update("totalAmount", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          type="number"
          step="0.01"
          placeholder={type === "DIVIDA" ? "Valor já pago" : "Valor já aportado"}
          value={form.paidAmount}
          onChange={(e) => update("paidAmount", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      {type === "DIVIDA" && (
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Parcelas"
            value={form.installments}
            onChange={(e) => update("installments", e.target.value)}
            className="w-1/2 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="number"
            min={1}
            max={31}
            placeholder="Dia de vencimento"
            value={form.dueDay}
            onChange={(e) => update("dueDay", e.target.value)}
            className="w-1/2 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      )}
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
    </Card>
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
  const [newRecord, setNewRecord] = useState({
    name: "",
    totalAmount: "",
    installments: "",
    dueDay: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const paymentLabel = type === "DIVIDA" ? "Registrar pagamento" : "Registrar aporte";

  async function submitPayment(id: string) {
    const value = Number(paymentInputs[id]);
    if (!value || value <= 0) return;
    const response = await fetch(`/api/financial-records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment: value }),
    });
    const updated = await response.json();
    setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setPaymentInputs((prev) => ({ ...prev, [id]: "" }));
  }

  async function handleDelete(id: string) {
    const label = type === "DIVIDA" ? "esta dívida" : "este investimento";
    if (
      !confirm(
        `Tem certeza que quer deletar ${label}? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setDeletingId(id);
    await fetch(`/api/financial-records/${id}`, { method: "DELETE" });
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  async function submitNewRecord() {
    if (!newRecord.name.trim() || !newRecord.totalAmount) return;
    setSaving(true);
    const response = await fetch("/api/financial-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newRecord.name,
        type,
        totalAmount: Number(newRecord.totalAmount),
        installments: newRecord.installments ? Number(newRecord.installments) : null,
        dueDay: newRecord.dueDay ? Number(newRecord.dueDay) : null,
        notes: newRecord.notes || null,
      }),
    });
    const created = await response.json();
    setRecords((prev) => [...prev, created]);
    setNewRecord({ name: "", totalAmount: "", installments: "", dueDay: "", notes: "" });
    setSaving(false);
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {records.length === 0 && (
        <p className="text-sm text-text-secondary">Nenhum registro ainda.</p>
      )}

      {records.map((record) => {
        const progress =
          record.totalAmount === 0
            ? 0
            : Math.min(100, Math.round((record.paidAmount / record.totalAmount) * 100));

        if (editingId === record.id) {
          return (
            <EditRecordForm
              key={record.id}
              record={record}
              type={type}
              onSaved={(updated) =>
                setRecords((prev) =>
                  prev.map((r) => (r.id === updated.id ? updated : r)),
                )
              }
              onClose={() => setEditingId(null)}
            />
          );
        }

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
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => setEditingId(record.id)}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    title="Deletar"
                    onClick={() => handleDelete(record.id)}
                    disabled={deletingId === record.id}
                    className="text-text-secondary hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
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

      {showForm ? (
        <Card className="flex flex-col gap-2">
          <input
            placeholder="Nome"
            value={newRecord.name}
            onChange={(e) => setNewRecord((prev) => ({ ...prev, name: e.target.value }))}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Valor total"
            value={newRecord.totalAmount}
            onChange={(e) =>
              setNewRecord((prev) => ({ ...prev, totalAmount: e.target.value }))
            }
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          {type === "DIVIDA" && (
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Parcelas"
                value={newRecord.installments}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, installments: e.target.value }))
                }
                className="w-1/2 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                type="number"
                placeholder="Dia de vencimento"
                value={newRecord.dueDay}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, dueDay: e.target.value }))
                }
                className="w-1/2 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}
          <input
            placeholder="Notas (opcional)"
            value={newRecord.notes}
            onChange={(e) => setNewRecord((prev) => ({ ...prev, notes: e.target.value }))}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            <Button onClick={submitNewRecord} disabled={saving}>
              Salvar
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : (
        <Button variant="secondary" onClick={() => setShowForm(true)}>
          + {type === "DIVIDA" ? "Nova dívida" : "Novo investimento"}
        </Button>
      )}
    </div>
  );
}
