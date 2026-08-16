"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  BusinessBadge,
  confirmAction,
  ErrorNote,
  IconButton,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { AddTransactionForm } from "./AddTransactionForm";
import { IncomeReceivedToggle } from "./IncomeReceivedToggle";
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
  received?: boolean;
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
    const confirmed = await confirmAction({
      title: "Tem certeza que quer deletar esta transação?",
      description: "Esta ação não pode ser desfeita.",
      destructive: true,
    });
    if (!confirmed) return;
    setDeletingId(id);
    setError(null);

    try {
      await api.delete(`/api/transactions/${id}`);
      router.refresh();
      notify("Excluído.");
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
            // No celular a linha quebra em duas: descrição em cima, valor e
            // ações embaixo. Em uma linha só, num visor de 375px, o nome
            // quebrava no meio da palavra e os botões saíam da tela.
            <li
              key={t.id}
              className={cn(
                "group flex flex-col gap-1.5 py-2 text-sm",
                "sm:flex-row sm:items-center sm:justify-between sm:gap-3",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                {/* Entrada prevista pode ser marcada como recebida daqui mesmo. */}
                {t.type === "ENTRADA" && (
                  <IncomeReceivedToggle
                    id={t.id}
                    received={t.received ?? true}
                  />
                )}
                <BusinessBadge business={t.business} />
                <div className="min-w-0">
                  <p className="truncate text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDateBR(new Date(t.date))} ·{" "}
                    {transactionCategoryLabels[t.category]}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-3">
                {t.type === "ENTRADA" && t.received === false && (
                  <Badge className="bg-badge-casa-bg text-badge-casa-text">
                    Previsto
                  </Badge>
                )}
                {/* `whitespace-nowrap`: sem isso o sinal e o número caíam em
                    linhas diferentes, e o "-" ficava órfão acima do valor. */}
                <span
                  className={cn(
                    "mr-auto whitespace-nowrap font-medium tabular-nums sm:mr-0",
                    t.type !== "ENTRADA"
                      ? "text-red-600"
                      : t.received === false
                        ? "text-text-secondary"
                        : "text-emerald-600",
                  )}
                >
                  {t.type === "ENTRADA" ? "+" : "-"}
                  {formatCurrencyBRL(t.amount)}
                </span>
                <div className="-my-2 flex items-center">
                  <IconButton
                    title="Editar"
                    revealOnHover
                    onClick={() => setEditingId(t.id)}
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    title="Deletar"
                    tone="danger"
                    revealOnHover
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
