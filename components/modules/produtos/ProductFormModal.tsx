"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, ErrorNote, Modal, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

export type ProductFormValues = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  basePrice: number | null;
  targetMargin: number | null;
  active: boolean;
  notes: string | null;
  businessId: string | null;
};

export type BusinessOption = { id: string; name: string };

const field =
  "w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

function emptyForm() {
  return {
    name: "",
    description: "",
    category: "",
    imageUrl: "",
    basePrice: "",
    targetMargin: "",
    notes: "",
    businessId: "",
    active: true,
  };
}

function formFrom(product: ProductFormValues) {
  return {
    name: product.name,
    description: product.description ?? "",
    category: product.category ?? "",
    imageUrl: product.imageUrl ?? "",
    basePrice: product.basePrice === null ? "" : String(product.basePrice),
    targetMargin: product.targetMargin === null ? "" : String(product.targetMargin),
    notes: product.notes ?? "",
    businessId: product.businessId ?? "",
    active: product.active,
  };
}

export function ProductFormModal({
  product,
  businesses,
  categories,
  onClose,
  onSaved,
}: {
  product?: ProductFormValues;
  businesses: BusinessOption[];
  /** Categorias já usadas, para o datalist — evita "Canecas" e "caneca". */
  categories: string[];
  onClose: () => void;
  /** Chamado depois de criar; recebe o id novo para a tela abrir o produto. */
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const isEdit = !!product;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(product ? formFrom(product) : emptyForm());

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      category: form.category || null,
      imageUrl: form.imageUrl,
      basePrice: form.basePrice === "" ? null : form.basePrice,
      targetMargin: form.targetMargin === "" ? null : form.targetMargin,
      notes: form.notes || null,
      // Vazio = produto de todos os negócios.
      businessId: form.businessId || null,
      active: form.active,
    };

    try {
      if (isEdit) {
        await api.patch(`/api/products/${product.id}`, payload);
      } else {
        const created = await api.post<{ id: string }>("/api/products", payload);
        onSaved?.(created.id);
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
      title={isEdit ? "Editar produto" : "Novo produto base"}
      size="md"
      onClose={onClose}
      onSubmit={handleSubmit}
    >

      {!isEdit && (
        <p className="text-xs text-text-secondary">
          Cadastre o item físico, não a arte: &ldquo;Caneca 325ml&rdquo;, não
          &ldquo;Caneca do Rick&rdquo;. A arte você dá na coleção.
        </p>
      )}

      <input
        placeholder="Nome do produto"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        className={field}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-text-secondary">Categoria</p>
          <input
            list="product-categories"
            placeholder="Canecas"
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className={field}
          />
          <datalist id="product-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <p className="mb-1 text-xs text-text-secondary">Negócio</p>
          <select
            value={form.businessId}
            onChange={(e) => update("businessId", e.target.value)}
            className={field}
          >
            <option value="">Todos os negócios</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                Só {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-text-secondary">Preço padrão (R$)</p>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.basePrice}
            onChange={(e) => update("basePrice", e.target.value)}
            className={field}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-text-secondary">Margem desejada (%)</p>
          <input
            type="number"
            min="0"
            max="99"
            step="1"
            placeholder="padrão"
            value={form.targetMargin}
            onChange={(e) => update("targetMargin", e.target.value)}
            className={field}
          />
        </div>
      </div>

      <textarea
        placeholder="Descrição"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        rows={2}
        className={field}
      />
      <input
        placeholder="Link da imagem (https://...)"
        value={form.imageUrl}
        onChange={(e) => update("imageUrl", e.target.value)}
        className={field}
      />
      <textarea
        placeholder="Notas — fornecedor, tempo de entrega, cuidados"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        rows={2}
        className={field}
      />

      {isEdit && (
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => update("active", e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Produto ativo
          <span className="text-xs text-text-secondary">
            (desativar tira da lista sem apagar o histórico)
          </span>
        </label>
      )}

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
