"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { productCategoryLabels } from "@/lib/labels";
import { formatDateBR, parseDateOnly, toDateInputValue } from "@/lib/utils";
import { addUtcMonths, type ProductView } from "@/lib/beleza-shared";
import { Field, Modal, fieldClass } from "./shared";

const categoryOptions = Object.keys(productCategoryLabels);

export function ProductFormModal({
  product,
  onClose,
}: {
  /** Ausente = cadastrando um produto novo. */
  product?: ProductView;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    category: product?.category ?? "SKINCARE_HIDRATACAO",
    openedAt: product?.openedAt ? toDateInputValue(product.openedAt) : "",
    pao: product?.pao ? String(product.pao) : "",
    expiresAt: product?.expiresAt ? toDateInputValue(product.expiresAt) : "",
    cost: product?.cost ? String(product.cost) : "",
    notes: product?.notes ?? "",
    createTransaction: false,
  });

  // Prévia da validade derivada — a mesma conta que o servidor faz ao salvar.
  const openedDate = form.openedAt ? parseDateOnly(form.openedAt) : null;
  const paoMonths = Number(form.pao);
  const derivedExpiry =
    openedDate && paoMonths > 0 ? addUtcMonths(openedDate, paoMonths) : null;

  const hasCost = Number(form.cost) > 0;

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const body = {
      name: form.name,
      brand: form.brand || null,
      category: form.category,
      openedAt: form.openedAt || null,
      pao: form.pao ? Number(form.pao) : null,
      expiresAt: form.expiresAt || null,
      cost: hasCost ? Number(form.cost) : null,
      notes: form.notes || null,
    };

    try {
      if (product) {
        await api.patch(`/api/beauty/products/${product.id}`, body);
      } else {
        await api.post("/api/beauty/products", {
          ...body,
          createTransaction: hasCost && form.createTransaction,
        });
      }
      router.refresh();
      notify("Salvo.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={product ? "Editar produto" : "Novo produto"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <Field label="Nome">
      <input
        placeholder="Sérum de vitamina C"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      <Field label="Marca (opcional)">
      <input
        value={form.brand}
        onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      <Field label="Categoria">
      <select
        value={form.category}
        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
        className={fieldClass}
      >
        {categoryOptions.map((c) => (
          <option key={c} value={c}>
            {productCategoryLabels[c]}
          </option>
        ))}
      </select>
      </Field>

      <div className="flex gap-2">
      <Field label="Abri em" className="flex-1">
        <input
          type="date"
          value={form.openedAt}
          onChange={(e) => setForm((prev) => ({ ...prev, openedAt: e.target.value }))}
          className={fieldClass}
        />
      </Field>
      <Field label="PAO em meses" className="flex-1">
        <input
          type="number"
          min="1"
          max="120"
          placeholder="12"
          value={form.pao}
          onChange={(e) => setForm((prev) => ({ ...prev, pao: e.target.value }))}
          className={fieldClass}
        />
      </Field>
      </div>

      {derivedExpiry ? (
      <p className="text-xs text-text-secondary">
        Validade calculada: {formatDateBR(derivedExpiry)} — o campo abaixo é ignorado.
      </p>
      ) : (
      <Field label="Validade (opcional)">
        <input
          type="date"
          value={form.expiresAt}
          onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
          className={fieldClass}
        />
        <span className="text-xs text-text-secondary">
          Para produto com validade impressa. Com abertura + PAO, ela é calculada.
        </span>
      </Field>
      )}

      <Field label="Quanto custou (opcional)">
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="0,00"
        value={form.cost}
        onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      {!product && hasCost && (
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={form.createTransaction}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, createTransaction: e.target.checked }))
          }
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Lançar no financeiro como saída de beleza
      </label>
      )}

      <Field label="Notas (opcional)">
      <input
        value={form.notes}
        onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      <ErrorNote message={error} />

      <div className="mt-2 flex gap-2">
      <Button type="submit" disabled={saving}>
        Salvar
      </Button>
      <Button variant="ghost" onClick={onClose}>
        Cancelar
      </Button>
      </div>
    </Modal>
  );
}
