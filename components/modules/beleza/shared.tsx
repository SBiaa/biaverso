"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CareUrgency, ExpiryStatus } from "@/lib/beleza-shared";

/** Estilo dos campos de formulário, repetido em todos os modais do módulo. */
export const fieldClass =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

/** Casca dos modais do módulo — mesma marcação dos modais de Visão. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} className="text-text-secondary" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Cores de urgência. Vermelho = atrasado ou vencendo, amarelo = está chegando,
 * verde = tranquilo. Os tokens de badge do app cobrem vermelho e verde; o
 * amarelo não existe entre eles, então vem do Tailwind.
 */
const urgencyStyles: Record<CareUrgency, string> = {
  ATRASADO: "bg-badge-ace-bg text-badge-ace-text",
  HOJE: "bg-amber-100 text-amber-800",
  PROXIMO: "bg-amber-100 text-amber-800",
  OK: "bg-badge-creative-bg text-badge-creative-text",
  SEM_DATA: "bg-border text-text-secondary",
};

/** Borda esquerda colorida do card, para bater o olho e ver o que está atrasado. */
export const urgencyBorder: Record<CareUrgency, string> = {
  ATRASADO: "border-l-4 border-l-red-500",
  HOJE: "border-l-4 border-l-amber-400",
  PROXIMO: "border-l-4 border-l-amber-400",
  OK: "border-l-4 border-l-transparent",
  SEM_DATA: "border-l-4 border-l-transparent",
};

/** "Atrasado 3 dias", "Hoje", "em 5 dias" — o texto do prazo. */
export function urgencyLabel(urgency: CareUrgency, days: number | null) {
  if (urgency === "SEM_DATA" || days === null) return "Sem data";
  if (urgency === "ATRASADO") {
    const late = Math.abs(days);
    return late === 1 ? "Atrasado 1 dia" : `Atrasado ${late} dias`;
  }
  if (urgency === "HOJE") return "Hoje";
  return days === 1 ? "Amanhã" : `Em ${days} dias`;
}

export function UrgencyPill({
  urgency,
  days,
}: {
  urgency: CareUrgency;
  days: number | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        urgencyStyles[urgency],
      )}
    >
      {urgencyLabel(urgency, days)}
    </span>
  );
}

const expiryStyles: Record<ExpiryStatus, string> = {
  VENCIDO: "bg-badge-ace-bg text-badge-ace-text",
  URGENTE: "bg-badge-ace-bg text-badge-ace-text",
  PROXIMO: "bg-amber-100 text-amber-800",
  OK: "bg-badge-creative-bg text-badge-creative-text",
  SEM_VALIDADE: "bg-border text-text-secondary",
};

export function expiryLabel(status: ExpiryStatus, days: number | null) {
  if (status === "SEM_VALIDADE" || days === null) return "Sem validade";
  if (status === "VENCIDO") {
    const late = Math.abs(days);
    return late === 1 ? "Vencido há 1 dia" : `Vencido há ${late} dias`;
  }
  return days === 0 ? "Vence hoje" : `Vence em ${days} dias`;
}

export function ExpiryPill({
  status,
  days,
}: {
  status: ExpiryStatus;
  days: number | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        expiryStyles[status],
      )}
    >
      {expiryLabel(status, days)}
    </span>
  );
}

/**
 * A posição no ciclo: ●○○. Preenchido = já passou nesta volta, anel = a etapa
 * da vez, vazio = ainda vem.
 */
export function CycleDots({
  total,
  currentIndex,
  titles,
}: {
  total: number;
  currentIndex: number;
  titles?: string[];
}) {
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          title={titles?.[i]}
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            i === currentIndex
              ? "bg-accent ring-2 ring-accent/30"
              : i < currentIndex
                ? "bg-accent/40"
                : "bg-border",
          )}
        />
      ))}
    </div>
  );
}
