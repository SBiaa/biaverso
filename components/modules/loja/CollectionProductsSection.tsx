"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Card, Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import { productMargin } from "@/lib/loja";

export type ProductRecord = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  cost: number | null;
  imageUrl: string | null;
  notes: string | null;
};

function emptyForm() {
  return { name: "", description: "", price: "", cost: "", imageUrl: "", notes: "" };
}

function formFromProduct(product: ProductRecord) {
  return {
    name: product.name,
    description: product.description ?? "",
    price: product.price === null ? "" : String(product.price),
    cost: product.cost === null ? "" : String(product.cost),
    imageUrl: product.imageUrl ?? "",
    notes: product.notes ?? "",
  };
}

function ProductModal({
  collectionId,
  product,
  onClose,
}: {
  collectionId: string;
  product?: ProductRecord;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!product;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(product ? formFromProduct(product) : emptyForm());

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      description: form.description || null,
      // Preço e custo em branco = "ainda não sei", não zero: com zero a margem
      // sairia como 100% de lucro.
      price: form.price === "" ? null : form.price,
      cost: form.cost === "" ? null : form.cost,
      notes: form.notes || null,
    };

    try {
      if (isEdit) {
        await api.patch(`/api/collections/${collectionId}/products/${product!.id}`, payload);
      } else {
        await api.post(`/api/collections/${collectionId}/products`, payload);
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
    if (!confirm("Excluir este produto?")) return;
    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/collections/${collectionId}/products/${product!.id}`);
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
        className="flex max-h-[90vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            {isEdit ? "Editar produto" : "Novo produto"}
          </h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <input
          placeholder="Nome"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <textarea
          placeholder="Descrição"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={2}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs text-text-secondary">Preço (R$)</p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-text-secondary">Custo (R$)</p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={(e) => update("cost", e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <input
          placeholder="Link da imagem (https://...)"
          value={form.imageUrl}
          onChange={(e) => update("imageUrl", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <textarea
          placeholder="Notas"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={2}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />

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

export function CollectionProductsSection({
  collectionId,
  products,
}: {
  collectionId: string;
  products: ProductRecord[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProductRecord | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Produtos</h2>
        <Button variant="secondary" onClick={() => setCreating(true)}>
          <Plus size={14} />
          Adicionar produto
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum produto nesta coleção ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((product) => {
            const margin = productMargin(product.price, product.cost);
            return (
              <Card
                key={product.id}
                onClick={() => setEditing(product)}
                className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-black/[0.02]"
              >
                {product.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{product.name}</p>
                  {product.description && (
                    <p className="line-clamp-1 text-xs text-text-secondary">
                      {product.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-text-primary">
                    {product.price === null ? "—" : formatCurrencyBRL(product.price)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Custo: {product.cost === null ? "—" : formatCurrencyBRL(product.cost)}
                  </p>
                  {margin !== null && (
                    <p
                      className={cn(
                        "text-xs font-medium",
                        margin >= 0 ? "text-emerald-600" : "text-red-600",
                      )}
                    >
                      Margem: {margin.toFixed(0)}%
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {creating && (
        <ProductModal collectionId={collectionId} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <ProductModal
          collectionId={collectionId}
          product={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
