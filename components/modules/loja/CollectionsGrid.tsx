"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { cn, formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { collectionStatusColors } from "@/lib/loja";
import { collectionStatusLabels } from "@/lib/labels";
import { CollectionFormModal, type CollectionRecord } from "./CollectionFormModal";

export type CollectionCard = {
  record: CollectionRecord;
  productCount: number;
  orderCount: number;
  ordersTotal: number;
};

export function CollectionsGrid({
  businessId,
  collections,
}: {
  businessId: string;
  collections: CollectionCard[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setCreating(true)}>
        <Plus size={14} />
        Nova coleção
      </Button>

      {collections.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhuma coleção criada ainda.</p>
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {collections.map(({ record, productCount, orderCount, ordersTotal }) => (
            <Link key={record.id} href={`/negocios/${businessId}/colecoes/${record.id}`}>
              <Card className="flex h-full flex-col gap-2 transition-colors hover:bg-hover">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">{record.name}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      collectionStatusColors[record.status],
                    )}
                  >
                    {collectionStatusLabels[record.status]}
                  </span>
                </div>

                {record.season && (
                  <p className="text-xs text-text-secondary">{record.season}</p>
                )}

                <p className="text-xs text-text-secondary">
                  Lançamento:{" "}
                  {record.launchDate ? formatDateBR(new Date(record.launchDate)) : "—"}
                </p>

                <div className="mt-auto flex flex-wrap gap-1 pt-1">
                  <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                    {productCount} produto(s)
                  </span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                    {orderCount} pedido(s) · {formatCurrencyBRL(ordersTotal)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <CollectionFormModal businessId={businessId} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}
