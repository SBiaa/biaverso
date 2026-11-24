"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  Card,
  confirmAction,
  ErrorNote,
  IconButton,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatCurrencyBRL } from "@/lib/utils";

type PurchaseItem = {
  id: string;
  description: string;
  totalAmount: number;
  paidAmount: number;
  installments: number;
  remainingCount: number;
  nextInvoice: string | null;
};

export function CardInstallmentsList({ items }: { items: PurchaseItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(item: PurchaseItem) {
    const confirmed = await confirmAction({
      title: `Deletar "${item.description}" apaga todas as ${item.installments} parcelas nas faturas do cartão. Esta ação não pode ser desfeita.`,
      destructive: true,
    });
    if (!confirmed) return;
    setDeletingId(item.id);
    setError(null);

    try {
      await api.delete(`/api/credit-card-purchases/${item.id}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      setError(errorMessage(e));
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhuma compra parcelada em aberto. Compras parceladas são cadastradas
        na página do cartão e aparecem aqui automaticamente.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ErrorNote message={error} />
      {items.map((item) => {
        const progress =
          item.totalAmount === 0
            ? 0
            : Math.min(
                100,
                Math.round((item.paidAmount / item.totalAmount) * 100),
              );

        return (
          <Card key={item.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {item.description}
                </p>
                <p className="text-xs text-text-secondary">
                  faltam {item.remainingCount} de {item.installments} parcelas
                  {item.nextInvoice ? ` · próxima na fatura de ${item.nextInvoice}` : ""}
                </p>
              </div>
              <IconButton
                title="Deletar compra"
                onClick={() => handleDelete(item)}
                disabled={deletingId === item.id}
                tone="danger"
              >
                <Trash2 size={15} />
              </IconButton>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                {formatCurrencyBRL(item.paidAmount)} de{" "}
                {formatCurrencyBRL(item.totalAmount)}
              </span>
              <span className="text-text-secondary">
                falta {formatCurrencyBRL(item.totalAmount - item.paidAmount)}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
