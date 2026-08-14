"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { Card, Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import {
  ProductFormModal,
  type BusinessOption,
  type ProductFormValues,
} from "./ProductFormModal";

export function ProductHeader({
  product,
  businesses,
  categories,
  businessName,
}: {
  product: ProductFormValues;
  businesses: BusinessOption[];
  categories: string[];
  businessName: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDuplicate() {
    setBusy(true);
    setError(null);

    try {
      const copy = await api.post<{ id: string }>(
        `/api/products/${product.id}/duplicate`,
        {},
      );
      router.push(`/produtos/${copy.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${product.name}" da central?`)) return;
    setBusy(true);
    setError(null);

    try {
      await api.delete(`/api/products/${product.id}`);
      router.push("/produtos");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-md object-cover"
            />
          )}
          <div>
            <p className="text-lg font-semibold text-text-primary">{product.name}</p>
            <p className="text-sm text-text-secondary">
              {[product.category, businessName ?? "Todos os negócios"]
                .filter(Boolean)
                .join(" · ")}
              {!product.active && " · inativo"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={14} />
            Editar
          </Button>
          <Button variant="secondary" onClick={handleDuplicate} disabled={busy}>
            <Copy size={14} />
            Duplicar
          </Button>
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={busy}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Excluir
          </Button>
        </div>
      </div>

      {product.description && (
        <p className="text-sm text-text-secondary">{product.description}</p>
      )}
      {product.notes && (
        <p className="whitespace-pre-wrap text-xs text-text-secondary">{product.notes}</p>
      )}

      <ErrorNote message={error} />

      {editing && (
        <ProductFormModal
          product={product}
          businesses={businesses}
          categories={categories}
          onClose={() => setEditing(false)}
        />
      )}
    </Card>
  );
}
