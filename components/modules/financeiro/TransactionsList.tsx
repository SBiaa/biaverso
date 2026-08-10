"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { BusinessBadge, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { AddTransactionForm } from "./AddTransactionForm";
import { cn, formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { transactionCategoryLabels } from "@/lib/labels";

type Business = { id: string; name: string; color: string };

type Transaction = {
  id: string;
  name: string;
  type: string;
  amount: number;
  date: string | Date;
  businessId: string | null;
  business: Business | null;
  category: string;
  payMethod: string | null;
  notes: string | null;
};

export function TransactionsList({
  transactions,
  businesses,
}: {
  transactions: Transaction[];
  businesses: Business[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Tem certeza que quer deletar esta transação? Esta ação não pode ser desfeita.",
      )
    )
      return;
    setDeletingId(id);
    setError(null);

    try {
      await api.delete(`/api/transactions/${id}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setDeletingId(null);
    }
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhuma transação encontrada.
      </p>
    );
  }

  return (
    <>
      <ErrorNote message={error} />
    <ul className="flex flex-col divide-y divide-border">
      {transactions.map((t) => {
        if (editingId === t.id) {
          return (
            <li key={t.id} className="py-2.5">
              <AddTransactionForm
                businesses={businesses}
                transaction={t}
                onClose={() => setEditingId(null)}
              />
            </li>
          );
        }

        return (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3 py-2.5 text-sm"
          >
            <div className="flex items-center gap-3">
              <BusinessBadge business={t.business} />
              <div>
                <p className="text-text-primary">{t.name}</p>
                <p className="text-xs text-text-secondary">
                  {formatDateBR(new Date(t.date))} ·{" "}
                  {transactionCategoryLabels[t.category]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "font-medium",
                  t.type === "ENTRADA" ? "text-emerald-600" : "text-red-600",
                )}
              >
                {t.type === "ENTRADA" ? "+" : "-"}
                {formatCurrencyBRL(t.amount)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Editar"
                  onClick={() => setEditingId(t.id)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  title="Deletar"
                  onClick={() => handleDelete(t.id)}
                  disabled={deletingId === t.id}
                  className="text-text-secondary hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
    </>
  );
}
