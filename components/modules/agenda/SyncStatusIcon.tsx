import { AlertCircle, Check, Clock } from "lucide-react";
import { syncStatusLabels } from "@/lib/labels";

/** Marca o estado de sincronização de um evento: ✓ sincronizado, ⏱ pendente, ! erro. */
export function SyncStatusIcon({ status }: { status: string }) {
  const label = syncStatusLabels[status] ?? status;

  if (status === "SINCRONIZADO") {
    return <Check size={14} className="shrink-0 text-emerald-600" aria-label={label} />;
  }

  if (status === "ERRO") {
    return <AlertCircle size={14} className="shrink-0 text-red-600" aria-label={label} />;
  }

  return <Clock size={14} className="shrink-0 text-text-secondary" aria-label={label} />;
}
