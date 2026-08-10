"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { orderStatusLabels } from "@/lib/labels";
import { todayInputValue, toDateInputValue } from "@/lib/utils";

const statusOptions = Object.keys(orderStatusLabels);

export type CollectionOption = { id: string; name: string };

export type OrderRecord = {
  id: string;
  orderNumber: string | null;
  customerName: string;
  customerContact: string | null;
  items: string;
  totalAmount: number;
  status: string;
  orderDate: string;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  collectionId: string | null;
};

function emptyForm() {
  return {
    orderNumber: "",
    customerName: "",
    customerContact: "",
    items: "",
    totalAmount: "",
    status: "PENDENTE",
    orderDate: todayInputValue(),
    dueDate: "",
    notes: "",
    collectionId: "",
  };
}

function formFromOrder(order: OrderRecord) {
  return {
    orderNumber: order.orderNumber ?? "",
    customerName: order.customerName,
    customerContact: order.customerContact ?? "",
    items: order.items,
    totalAmount: String(order.totalAmount),
    status: order.status,
    orderDate: toDateInputValue(order.orderDate),
    dueDate: order.dueDate ? toDateInputValue(order.dueDate) : "",
    notes: order.notes ?? "",
    collectionId: order.collectionId ?? "",
  };
}

export function OrderModal({
  businessId,
  collections,
  order,
  defaultCollectionId,
  onClose,
}: {
  businessId: string;
  collections: CollectionOption[];
  order?: OrderRecord;
  defaultCollectionId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!order;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(
    order
      ? formFromOrder(order)
      : { ...emptyForm(), collectionId: defaultCollectionId ?? "" },
  );
  // Entregar um pedido normalmente significa dinheiro que entrou — a entrada
  // fica marcada por padrão, mas dá para desmarcar (venda ainda não paga).
  const [createTransaction, setCreateTransaction] = useState(true);

  const wasDelivered = order?.status === "ENTREGUE";
  const offerTransaction = form.status === "ENTREGUE" && !wasDelivered;

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.customerName.trim() || !form.items.trim()) return;
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      businessId,
      orderNumber: form.orderNumber || null,
      customerContact: form.customerContact || null,
      totalAmount: form.totalAmount || 0,
      dueDate: form.dueDate || null,
      notes: form.notes || null,
      collectionId: form.collectionId || null,
    };

    try {
      if (isEdit) await api.patch(`/api/orders/${order!.id}`, payload);
      else await api.post("/api/orders", payload);

      if (offerTransaction && createTransaction) {
        await api.post("/api/transactions", {
          name: `Pedido ${form.orderNumber || form.customerName}`,
          type: "ENTRADA",
          amount: form.totalAmount || 0,
          date: todayInputValue(),
          category: "RECEITA_VENDA",
          businessId,
        });
      }

      router.refresh();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Excluir este pedido?")) return;
    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/orders/${order!.id}`);
      router.refresh();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            {isEdit ? "Editar pedido" : "Novo pedido"}
          </h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Nº do pedido"
            value={form.orderNumber}
            onChange={(e) => update("orderNumber", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {orderStatusLabels[s]}
              </option>
            ))}
          </select>
        </div>

        <input
          placeholder="Nome do cliente"
          value={form.customerName}
          onChange={(e) => update("customerName", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          placeholder="Contato (WhatsApp, Instagram...)"
          value={form.customerContact}
          onChange={(e) => update("customerContact", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />

        <textarea
          placeholder="Itens do pedido"
          value={form.items}
          onChange={(e) => update("items", e.target.value)}
          rows={3}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs text-text-secondary">Valor total (R$)</p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.totalAmount}
              onChange={(e) => update("totalAmount", e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-text-secondary">Coleção</p>
            <select
              value={form.collectionId}
              onChange={(e) => update("collectionId", e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Sem coleção</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs text-text-secondary">Data do pedido</p>
            <input
              type="date"
              value={form.orderDate}
              onChange={(e) => update("orderDate", e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-text-secondary">Prazo de entrega</p>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <textarea
          placeholder="Notas"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={2}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />

        {offerTransaction && (
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={createTransaction}
              onChange={(e) => setCreateTransaction(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            Lançar uma entrada de R$ {form.totalAmount || 0} no financeiro deste negócio.
          </label>
        )}

        <ErrorNote message={error} />

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={saving}>
              Salvar
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
          {isEdit && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:bg-red-50"
            >
              Excluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
