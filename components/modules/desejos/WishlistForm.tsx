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

  const modal = open && (
    <Modal
      title={isEdit ? "Editar desejo" : "Novo desejo"}
      onClose={close}
      onSubmit={handleSubmit}
      size="md"
    >
      <Field label="O que você quer">
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field label="Descrição (opcional)">
        <input
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className={fieldClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Para o que é">
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
                {wishCategoryLabels[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prioridade">
          <select
            value={form.priority}
            onChange={(e) => update("priority", e.target.value)}
            className={fieldClass}
          >
            {priorityOptions.map((p) => (
              <option key={p} value={p}>
                {wishPriorityLabels[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Quanto custa (opcional)">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Quer ter até (opcional)">
          <input
            type="date"
            value={form.targetDate}
            onChange={(e) => update("targetDate", e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Link (opcional)">
          <input
            type="url"
            placeholder="https://"
            value={form.url}
            onChange={(e) => update("url", e.target.value)}
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
        <Button type="submit" disabled={saving || !form.name.trim()}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="ghost" onClick={close}>
          Cancelar
        </Button>
      </ModalActions>
    </Modal>
  );

  // Editando, o cartão de quem chama continua na tela: aqui só entra o modal.
  if (isEdit) return modal;

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Novo desejo</Button>
      {modal}
    </>
  );
}
