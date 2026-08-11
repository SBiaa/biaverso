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
      className={cn(
        "shrink-0 disabled:opacity-50",
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
