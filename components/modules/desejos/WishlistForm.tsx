"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { toDateInputValue } from "@/lib/utils";
import { wishCategoryLabels, wishPriorityLabels } from "@/lib/labels";

const categoryOptions = Object.keys(wishCategoryLabels);
const priorityOptions = Object.keys(wishPriorityLabels);

type Business = { id: string; name: string };

export type WishlistItemInput = {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  price: number | null;
  priority: string;
  category: string;
  targetDate: string | null;
  notes: string | null;
  businessId: string | null;
};

const field =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

export function WishlistForm({
  businesses,
  item,
  onClose,
}: {
  businesses: Business[];
  item?: WishlistItemInput;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!item;
  const [open, setOpen] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    url: item?.url ?? "",
    price: item?.price != null ? String(item.price) : "",
    priority: item?.priority ?? "QUERO",
    category: item?.category ?? categoryOptions[0],
    businessId: item?.businessId ?? "",
    targetDate: item?.targetDate ? toDateInputValue(item.targetDate) : "",
    notes: item?.notes ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function close() {
    setOpen(false);
    onClose?.();
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      url: form.url || null,
      price: form.price ? Number(form.price) : null,
      priority: form.priority,
      category: form.category,
      businessId: form.businessId || null,
      targetDate: form.targetDate || null,
      notes: form.notes || null,
    };

    try {
      if (isEdit) await api.patch(`/api/wishlist/${item!.id}`, payload);
      else await api.post("/api/wishlist", payload);
      close();
      if (!isEdit) {
        setForm((prev) => ({
          ...prev,
          name: "",
          description: "",
          url: "",
          price: "",
          notes: "",
        }));
      }
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Novo desejo</Button>;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <ErrorNote message={error} />
      <input
        placeholder="O que você quer"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        className={field}
      />
      <input
        placeholder="Descrição (opcional)"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        className={field}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Para o que é</span>
          <select
            value={form.businessId}
            onChange={(e) => update("businessId", e.target.value)}
            className={field}
          >
            <option value="">Pessoal/Casa</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Categoria</span>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className={field}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {wishCategoryLabels[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Prioridade</span>
          <select
            value={form.priority}
            onChange={(e) => update("priority", e.target.value)}
            className={field}
          >
            {priorityOptions.map((p) => (
              <option key={p} value={p}>
                {wishPriorityLabels[p]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">
            Quanto custa (opcional)
          </span>
          <input
            type="number"
            step="0.01"
            placeholder="0,00"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">
            Quer ter até (opcional)
          </span>
          <input
            type="date"
            value={form.targetDate}
            onChange={(e) => update("targetDate", e.target.value)}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Link (opcional)</span>
          <input
            placeholder="https://"
            value={form.url}
            onChange={(e) => update("url", e.target.value)}
            className={field}
          />
        </label>
      </div>

      <input
        placeholder="Notas (opcional)"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        className={field}
      />

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving || !form.name.trim()}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={close}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
