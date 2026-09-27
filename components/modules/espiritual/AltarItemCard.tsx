"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  AttentionBadge,
  Card,
  ErrorNote,
  IconButton,
  confirmAction,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { altarCategoryLabels, type AltarItemView } from "@/lib/espiritual-shared";
import { AltarForm } from "./AltarForm";

export function AltarItemCard({ item }: { item: AltarItemView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [runningLow, setRunningLow] = useState(item.runningLow);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return <AltarForm item={item} onClose={() => setEditing(false)} />;
  }

  async function toggleRunningLow() {
    const next = !runningLow;
    // Otimista: marcar "está acabando" é um clique de passagem, e esperar o
    // servidor para pintar o selo deixaria a lista com cara de travada.
    setRunningLow(next);
    setError(null);

    try {
      await api.patch(`/api/altar-items/${item.id}`, { runningLow: next });
    } catch (e) {
      setRunningLow(!next);
      setError(errorMessage(e));
    }
  }

  async function handleDelete() {
    const ok = await confirmAction({
      title: `Excluir ${item.name}?`,
      description: "Sai do inventário do altar.",
      destructive: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/api/altar-items/${item.id}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Card className="group flex flex-col gap-2">
      <ErrorNote message={error} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary">
            {altarCategoryLabels[item.category] ?? item.category}
          </p>
          <p className="text-sm font-semibold text-text-primary">{item.name}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <IconButton aria-label="Editar" revealOnHover onClick={() => setEditing(true)}>
            <Pencil size={15} />
          </IconButton>
          <IconButton
            aria-label="Excluir"
            tone="danger"
            revealOnHover
            onClick={handleDelete}
          >
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>

      {item.quantity && (
        <p className="text-sm text-text-primary">{item.quantity}</p>
      )}
      {item.properties && (
        <p className="text-xs text-text-secondary">{item.properties}</p>
      )}
      {item.notes && (
        <p className="whitespace-pre-wrap text-xs text-text-secondary">
          {item.notes}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={toggleRunningLow}
          className="-my-1 py-1 text-xs font-medium text-accent"
        >
          {runningLow ? "Repus" : "Está acabando"}
        </button>
        {runningLow && <AttentionBadge level="atencao">acabando</AttentionBadge>}
      </div>
    </Card>
  );
}
