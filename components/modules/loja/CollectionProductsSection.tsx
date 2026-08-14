"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { Card, Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import {
  buildCostBreakdown,
  effectivePrice,
  formatMinutes,
  hasCostData,
  marginAt,
  marginTone,
  totalCostAt,
  type CostItemInput,
} from "@/lib/produtos";

/** O produto base, como ele chega do catálogo. */
export type CatalogProduct = {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  basePrice: number | null;
  targetMargin: number | null;
  costItems: CostItemInput[];
};

/** A peça dentro desta coleção. */
export type CollectionItemRecord = {
  id: string;
  productId: string;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  extraCost: number | null;
  notes: string | null;
};

const field =
  "w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

function emptyForm() {
  return { name: "", description: "", price: "", extraCost: "", imageUrl: "", notes: "" };
}

function formFrom(item: CollectionItemRecord) {
  return {
    name: item.name ?? "",
    description: item.description ?? "",
    price: item.price === null ? "" : String(item.price),
    extraCost: item.extraCost === null ? "" : String(item.extraCost),
    imageUrl: item.imageUrl ?? "",
    notes: item.notes ?? "",
  };
}

/** Escolher a base é o primeiro passo de adicionar uma peça. */
function ProductPicker({
  products,
  onPick,
  onClose,
}: {
  products: CatalogProduct[];
  onPick: (product: CatalogProduct) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      `${p.name} ${p.category ?? ""}`.toLowerCase().includes(term),
    );
  }, [products, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-hidden rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            Escolher produto da central
          </h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border px-3">
          <Search size={14} className="shrink-0 text-text-secondary" />
          <input
            autoFocus
            placeholder="Buscar caneca, almofada..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-1.5 text-sm outline-none"
          />
        </div>

        <div className="-mx-1 flex flex-col overflow-y-auto px-1">
          {filtered.length === 0 ? (
            <p className="py-4 text-sm text-text-secondary">
              Nenhum produto encontrado.{" "}
              <Link href="/produtos" className="font-medium text-accent">
                Cadastrar na central
              </Link>
            </p>
          ) : (
            filtered.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onPick(product)}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-black/[0.03]"
              >
                {product.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded object-cover"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-primary">
                    {product.name}
                  </span>
                  {product.category && (
                    <span className="block text-xs text-text-secondary">
                      {product.category}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm text-text-secondary">
                  {product.basePrice === null ? "—" : formatCurrencyBRL(product.basePrice)}
                </span>
              </button>
            ))
          )}
        </div>

        <Link href="/produtos" className="text-xs font-medium text-accent">
          Cadastrar um produto novo na central →
        </Link>
      </div>
    </div>
  );
}

function ItemModal({
  collectionId,
  product,
  item,
  hourlyRate,
  onClose,
}: {
  collectionId: string;
  product: CatalogProduct;
  item?: CollectionItemRecord;
  hourlyRate: number | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!item;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(item ? formFrom(item) : emptyForm());

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Preview ao vivo: digitar o preço mostra na hora o que sobra.
  const extra = form.extraCost === "" ? 0 : Number(form.extraCost) || 0;
  const breakdown = buildCostBreakdown(product.costItems, { hourlyRate, extra });
  const price = form.price === "" ? product.basePrice : Number(form.price) || 0;
  const known = hasCostData(product.costItems, extra);
  const cost = totalCostAt(breakdown, price);
  const margin = known ? marginAt(breakdown, price) : null;

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name || null,
      description: form.description || null,
      // Em branco = herda o preço da base, não zero.
      price: form.price === "" ? null : form.price,
      extraCost: form.extraCost === "" ? null : form.extraCost,
      imageUrl: form.imageUrl,
      notes: form.notes || null,
    };

    try {
      if (isEdit) {
        await api.patch(`/api/collections/${collectionId}/products/${item.id}`, payload);
      } else {
        await api.post(`/api/collections/${collectionId}/products`, {
          ...payload,
          productId: product.id,
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
    if (!confirm("Tirar esta peça da coleção? O produto continua na central.")) return;
    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/collections/${collectionId}/products/${item.id}`);
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
            {isEdit ? "Editar peça" : "Adicionar à coleção"}
          </h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg bg-black/[0.02] px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">Produto base</p>
            <p className="truncate text-sm font-medium text-text-primary">{product.name}</p>
          </div>
          <Link
            href={`/produtos/${product.id}`}
            className="shrink-0 text-xs font-medium text-accent"
          >
            Ver custos
          </Link>
        </div>

        <div>
          <p className="mb-1 text-xs text-text-secondary">Nome da peça (a arte)</p>
          <input
            placeholder={product.name}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={field}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs text-text-secondary">Preço nesta coleção (R$)</p>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder={
                product.basePrice === null ? "sem preço na base" : String(product.basePrice)
              }
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              className={field}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-text-secondary">Custo extra da peça (R$)</p>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="arte, tag..."
              value={form.extraCost}
              onChange={(e) => update("extraCost", e.target.value)}
              className={field}
            />
          </div>
        </div>

        <p className="text-xs text-text-secondary">
          Preço em branco usa o da base ({" "}
          {product.basePrice === null ? "sem preço" : formatCurrencyBRL(product.basePrice)} ),
          então reajustar a base vale para esta peça também.
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-black/[0.02] px-3 py-2 text-sm">
          <span className="text-text-secondary">
            Custo:{" "}
            <span className="text-text-primary">
              {known ? formatCurrencyBRL(cost) : "sem custo cadastrado"}
            </span>
          </span>
          <span className="text-text-secondary">
            Preço:{" "}
            <span className="text-text-primary">
              {price === null ? "—" : formatCurrencyBRL(price)}
            </span>
          </span>
          <span className={cn("font-medium", marginTone(margin, product.targetMargin ?? 60))}>
            Margem: {margin === null ? "—" : `${margin.toFixed(0)}%`}
          </span>
        </div>

        <textarea
          placeholder="Descrição"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={2}
          className={field}
        />
        <input
          placeholder="Link da imagem da arte (https://...)"
          value={form.imageUrl}
          onChange={(e) => update("imageUrl", e.target.value)}
          className={field}
        />
        <textarea
          placeholder="Notas"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={2}
          className={field}
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
              Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CollectionProductsSection({
  collectionId,
  items,
  catalog,
  hourlyRate,
  defaultTargetMargin,
}: {
  collectionId: string;
  items: CollectionItemRecord[];
  /** Produtos ativos que este negócio pode usar. */
  catalog: CatalogProduct[];
  hourlyRate: number | null;
  defaultTargetMargin: number;
}) {
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState<CatalogProduct | null>(null);
  const [editing, setEditing] = useState<CollectionItemRecord | null>(null);

  const byId = useMemo(
    () => new Map(catalog.map((product) => [product.id, product])),
    [catalog],
  );

  const editingProduct = editing ? byId.get(editing.productId) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Produtos da coleção</h2>
        <Button variant="secondary" onClick={() => setPicking(true)}>
          <Plus size={14} />
          Adicionar produto
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Nenhum produto nesta coleção ainda. Escolha da{" "}
          <Link href="/produtos" className="font-medium text-accent">
            central de produtos
          </Link>{" "}
          e dê a arte desta temporada.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const product = byId.get(item.productId);
            const target = product?.targetMargin ?? defaultTargetMargin;
            const breakdown = buildCostBreakdown(product?.costItems ?? [], {
              hourlyRate,
              extra: item.extraCost ?? 0,
            });
            const price = effectivePrice(item.price, product?.basePrice);
            const known = hasCostData(product?.costItems ?? [], item.extraCost);
            const cost = totalCostAt(breakdown, price);
            const margin = known ? marginAt(breakdown, price) : null;
            const image = item.imageUrl ?? product?.imageUrl;

            return (
              <Card
                key={item.id}
                onClick={() => setEditing(item)}
                className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-black/[0.02]"
              >
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {item.name ?? product?.name ?? "Produto"}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {product?.name ?? "produto removido da central"}
                    {breakdown.minutes > 0 && ` · ${formatMinutes(breakdown.minutes)}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-text-primary">
                    {price === null ? "—" : formatCurrencyBRL(price)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Custo: {known ? formatCurrencyBRL(cost) : "—"}
                  </p>
                  <p className={cn("text-xs font-medium", marginTone(margin, target))}>
                    Margem: {margin === null ? "—" : `${margin.toFixed(0)}%`}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {picking && (
        <ProductPicker
          products={catalog}
          onClose={() => setPicking(false)}
          onPick={(product) => {
            setPicking(false);
            setAdding(product);
          }}
        />
      )}
      {adding && (
        <ItemModal
          collectionId={collectionId}
          product={adding}
          hourlyRate={hourlyRate}
          onClose={() => setAdding(null)}
        />
      )}
      {editing && editingProduct && (
        <ItemModal
          collectionId={collectionId}
          product={editingProduct}
          item={editing}
          hourlyRate={hourlyRate}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
