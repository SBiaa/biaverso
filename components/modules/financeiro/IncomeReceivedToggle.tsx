"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

/**
 * Marca que a entrada caiu na conta. Enquanto não cair, ela fica só na
 * previsão e não soma no saldo do mês.
 */
export function IncomeReceivedToggle({
  id,
  received,
  className,
}: {
  id: string;
  received: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/transactions/${id}/received`, {
        received: !received,
      });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      title={
        error ??
        (received
          ? "Caiu na conta — clique para voltar a previsto"
          : "Marcar que caiu na conta")
      }
      // O ícone continua com 18px, mas a área que responde ao toque tem 44.
      // As margens negativas devolvem o espaço extra ao layout, para a linha
      // da transação não crescer por causa do alvo.
      className={cn(
        "-m-2.5 flex size-11 shrink-0 items-center justify-center rounded-full",
        "transition-colors hover:bg-hover-strong disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        error && "text-red-600",
        className,
      )}
    >
      {received ? (
        <CheckCircle2 size={18} className={cn(!error && "text-emerald-600")} />
      ) : (
        <Circle size={18} className={cn(!error && "text-text-secondary")} />
      )}
    </button>
  );
}
