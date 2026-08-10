"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { cn, formatDateBR } from "@/lib/utils";
import { collectionStatusColors } from "@/lib/loja";
import { collectionStatusLabels } from "@/lib/labels";
import { CollectionFormModal, type CollectionRecord } from "./CollectionFormModal";

export function CollectionHeader({
  businessId,
  collection,
}: {
  businessId: string;
  collection: CollectionRecord;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-text-primary">{collection.name}</p>
          {collection.season && (
            <p className="text-sm text-text-secondary">{collection.season}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              collectionStatusColors[collection.status],
            )}
          >
            {collectionStatusLabels[collection.status]}
          </span>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={14} />
            Editar
          </Button>
        </div>
      </div>

      {collection.description && (
        <p className="text-sm text-text-secondary">{collection.description}</p>
      )}

      <p className="text-xs text-text-secondary">
        Lançamento:{" "}
        {collection.launchDate ? formatDateBR(new Date(collection.launchDate)) : "—"}
      </p>

      {editing && (
        <CollectionFormModal
          businessId={businessId}
          collection={collection}
          onClose={() => setEditing(false)}
          onDeleted={() => router.push(`/negocios/${businessId}/colecoes`)}
        />
      )}
    </Card>
  );
}
