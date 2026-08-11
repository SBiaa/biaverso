"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Pencil, Plus, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { Badge, Button, Card, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { productCategoryLabels } from "@/lib/labels";
import { cn, formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import type { ProductView } from "@/lib/beleza-shared";
import { ProductFormModal } from "./ProductFormModal";
import { ExpiryPill } from "./shared";

const statusFilters = [
  { key: "ativos", label: "Ativos" },
  { key: "acabados", label: "Acabados" },
  { key: "todos", label: "Todos" },
];

function ProductCard({
  product,
  onError,
}: {
  product: ProductView;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    onError(null);
    try {
      await api.patch(`/api/beauty/products/${product.id}`, body);
      router.refresh();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Deletar "${product.name}"? As rotinas que usavam ele continuam, só perdem o vínculo.`,
      )
    )
      return;

    onError(null);
    try {
      await api.delete(`/api/beauty/products/${product.id}`);
      router.refresh();
    } catch (e) {
      onError(errorMessage(e));
    }
  }

  return (
    <>
      <Card className={cn("flex flex-col gap-2", product.finished && "opacity-60")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">
              {product.name}
            </p>
            {product.brand && (
              <p className="truncate text-xs text-text-secondary">{product.brand}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              title="Editar"
              onClick={() => setEditing(true)}
              className="text-text-secondary hover:text-text-primary"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              title="Deletar"
              onClick={handleDelete}
              className="text-text-secondary hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge>{productCategoryLabels[product.category]}</Badge>
          {product.finished ? (
            <Badge>
              Acabou
              {product.finishedAt && ` · ${formatDateBR(new Date(product.finishedAt))}`}
            </Badge>
          ) : (
            <ExpiryPill status={product.status} days={product.daysUntilExpiry} />
          )}
          {product.runningLow && !product.finished && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              <TriangleAlert size={11} />
              Quase acabando
            </span>
          )}
        </div>

        <div className="text-xs text-text-secondary">
          {product.openedAt && <p>Aberto em {formatDateBR(new Date(product.openedAt))}</p>}
          {product.pao && <p>PAO {product.pao}M</p>}
          {product.cost !== null && <p>{formatCurrencyBRL(product.cost)}</p>}
          {product.notes && <p>{product.notes}</p>}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-2">
          {!product.finished && (
            <Button
              variant="ghost"
              onClick={() => patch({ runningLow: !product.runningLow })}
              disabled={saving}
              className="px-2 py-1 text-xs"
            >
              <TriangleAlert size={13} />
              {product.runningLow ? "Não está acabando" : "Está acabando"}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => patch({ finished: !product.finished })}
            disabled={saving}
            className="px-2 py-1 text-xs"
          >
            {product.finished ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
            {product.finished ? "Reabrir" : "Marcar como acabado"}
          </Button>
        </div>
      </Card>

      {editing && (
        <ProductFormModal product={product} onClose={() => setEditing(false)} />
      )}
    </>
  );
}

export function ProductGrid({
  products,
  category,
  status,
}: {
  products: ProductView[];
  category: string;
  status: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Os filtros vivem na URL para o link poder ser compartilhado e o botão
  // voltar do navegador funcionar.
  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setParam("status", filter.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                status === filter.key
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-black/[0.03]",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <select
          value={category}
          onChange={(e) => setParam("category", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Todas as categorias</option>
          {Object.entries(productCategoryLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <Button className="ml-auto" onClick={() => setCreating(true)}>
          <Plus size={14} />
          Novo produto
        </Button>
      </div>

      <ErrorNote message={error} />

      {products.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Nenhum produto com esses filtros.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onError={setError} />
          ))}
        </div>
      )}

      {creating && <ProductFormModal onClose={() => setCreating(false)} />}
    </div>
  );
}
