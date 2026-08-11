"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import {
  formatCurrencyBRL,
  formatDateBR,
  formatMonthYearBR,
  todayInputValue,
} from "@/lib/utils";
import type { Invoice } from "@/lib/finance";

/**
 * Pagamento da fatura do mês. É daqui que sai o status das assinaturas
 * cobradas no cartão — elas não são pagas separadamente.
 */
export function InvoicePaymentPanel({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    paidAmount: String(invoice.total.toFixed(2)),
    paidAt: todayInputValue(),
    createTransaction: true,
  });

  async function submit(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      await api.patch("/api/financeiro/fatura", {
        month: invoice.month,
        year: invoice.year,
        ...body,
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (invoice.status === "PAGA") {
    return (
      <div className="flex flex-col gap-2">
        <ErrorNote message={error} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-text-primary">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Fatura paga
            {invoice.paidAt && ` em ${formatDateBR(new Date(invoice.paidAt))}`}
            {invoice.paidAmount !== null && (
              <span className="text-text-secondary">
                · {formatCurrencyBRL(invoice.paidAmount)}
                {Math.abs(invoice.paidAmount - invoice.total) > 0.005 &&
                  ` de ${formatCurrencyBRL(invoice.total)}`}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              if (
                !confirm(
                  invoice.paymentTransactionId
                    ? "Reabrir a fatura também apaga a transação de saída lançada com o pagamento. Continuar?"
                    : "Reabrir esta fatura?",
                )
              )
                return;
              submit({ status: "ABERTA" });
            }}
            disabled={saving}
            className="text-xs font-medium text-text-secondary underline hover:text-text-primary disabled:opacity-50"
          >
            reabrir fatura
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <ErrorNote message={error} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-text-secondary">
            <Circle size={16} />
            Fatura de {formatMonthYearBR(invoice.month, invoice.year)} em aberto
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                paidAmount: String(invoice.total.toFixed(2)),
              }));
              setOpen(true);
            }}
            disabled={invoice.total <= 0}
          >
            Marcar como paga
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ErrorNote message={error} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Quanto saiu</span>
          <input
            type="number"
            step="0.01"
            value={form.paidAmount}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, paidAmount: e.target.value }))
            }
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Quando pagou</span>
          <input
            type="date"
            value={form.paidAt}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, paidAt: e.target.value }))
            }
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={form.createTransaction}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, createTransaction: e.target.checked }))
          }
          className="mt-0.5"
        />
        <span>
          Lançar também como saída nas transações
          <span className="block text-xs text-text-secondary">
            Só para o extrato bater com o banco — não conta duas vezes no total
            do mês, quem conta é a fatura.
          </span>
        </span>
      </label>

      <div className="flex gap-2">
        <Button
          onClick={() =>
            submit({
              status: "PAGA",
              paidAmount: Number(form.paidAmount),
              paidAt: form.paidAt,
              createTransaction: form.createTransaction,
            })
          }
          disabled={saving || !form.paidAmount}
        >
          Confirmar pagamento
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
