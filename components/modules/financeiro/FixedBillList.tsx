"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import {
  cn,
  formatCurrencyBRL,
  formatUtcDateBR,
  toDateInputValue,
} from "@/lib/utils";
import { billStatusLabels, fixedBillTypeLabels } from "@/lib/labels";

const typeOptions = Object.keys(fixedBillTypeLabels);

type BillItem = {
  logId: string;
  fixedBillId: string;
  name: string;
  amount: number;
  dueDate: string;
  type: string;
  notes: string | null;
  status: "PAGO" | "PENDENTE" | "ATRASADO";
};

const statusStyles: Record<string, string> = {
  PAGO: "bg-badge-creative-bg text-badge-creative-text",
  PENDENTE: "bg-badge-casa-bg text-badge-casa-text",
  ATRASADO: "bg-badge-ace-bg text-badge-ace-text",
};

function todayInputValue() {
  const d = new Date();
  return toDateInputValue(
    new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())),
  );
}

function FixedBillForm({
  item,
  onClose,
}: {
  item?: BillItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: item?.name ?? "",
    amount: item ? String(item.amount) : "",
    dueDate: item ? toDateInputValue(item.dueDate) : todayInputValue(),
    type: item?.type ?? typeOptions[0],
    notes: item?.notes ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.amount || !form.dueDate) return;
    setSaving(true);
    // A conta se repete todo mês, então o que fica guardado é o dia da data escolhida.
    const dueDay = Number(form.dueDate.split("-")[2]);
    await fetch(
      item ? `/api/fixed-bills/${item.fixedBillId}` : "/api/fixed-bills",
      {
        method: item ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          amount: Number(form.amount),
          dueDay,
          type: form.type,
          notes: form.notes || null,
        }),
      },
    );
    setSaving(false);
    onClose();
    router.refresh();
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
          placeholder="Valor"
          value={form.amount}
          onChange={(e) => update("amount", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-text-secondary">
            Vencimento (repete todo mês nesse dia)
          </span>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => update("dueDate", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
      </div>
      <select
        value={form.type}
        onChange={(e) => update("type", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        {typeOptions.map((t) => (
          <option key={t} value={t}>
            {fixedBillTypeLabels[t]}
          </option>
        ))}
      </select>
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

export function FixedBillList({ items: initialItems }: { items: BillItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function toggle(logId: string) {
    const item = items.find((i) => i.logId === logId);
    if (!item) return;
    const nextStatus = item.status === "PAGO" ? "PENDENTE" : "PAGO";
    setItems((prev) =>
      prev.map((i) => (i.logId === logId ? { ...i, status: nextStatus } : i)),
    );
    const response = await fetch(`/api/fixed-bill-logs/${logId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    // Ao desmarcar, o servidor decide entre PENDENTE e ATRASADO.
    const log = await response.json();
    setItems((prev) =>
      prev.map((i) => (i.logId === logId ? { ...i, status: log.status } : i)),
    );
  }

  async function handleDelete(fixedBillId: string) {
    if (
      !confirm(
        "Tem certeza que quer deletar esta conta fixa? Esta ação não pode ser desfeita.",
      )
    )
      return;
    setDeletingId(fixedBillId);
    await fetch(`/api/fixed-bills/${fixedBillId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && !creating && (
        <p className="text-sm text-text-secondary">
          Nenhuma conta fixa cadastrada.
        </p>
      )}

      {items.map((item) => {
        if (editingId === item.fixedBillId) {
          return (
            <FixedBillForm
              key={item.logId}
              item={item}
              onClose={() => setEditingId(null)}
            />
          );
        }

        return (
          <Card key={item.logId} className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => toggle(item.logId)}
              className="flex items-center gap-3 text-left"
            >
              {item.status === "PAGO" ? (
                <CheckCircle2 size={18} className="text-accent" />
              ) : (
                <Circle size={18} className="text-text-secondary" />
              )}
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {item.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {fixedBillTypeLabels[item.type]} · vence em{" "}
                  {formatUtcDateBR(new Date(item.dueDate))}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  statusStyles[item.status],
                )}
              >
                {billStatusLabels[item.status]}
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {formatCurrencyBRL(item.amount)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Editar"
                  onClick={() => setEditingId(item.fixedBillId)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  title="Deletar"
                  onClick={() => handleDelete(item.fixedBillId)}
                  disabled={deletingId === item.fixedBillId}
                  className="text-text-secondary hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        );
      })}

      {creating ? (
        <FixedBillForm onClose={() => setCreating(false)} />
      ) : (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => setCreating(true)}
        >
          + Nova conta fixa
        </Button>
      )}
    </div>
  );
}
