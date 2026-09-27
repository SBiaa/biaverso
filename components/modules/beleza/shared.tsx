"use client";

import { cn } from "@/lib/utils";
import { AttentionBadge, attentionBorder, type AttentionLevel } from "@/components/ui";
import type { CareUrgency, ExpiryStatus } from "@/lib/beleza-shared";

// A casca do modal e os campos saíram daqui para `components/ui`: eram uma
// cópia por módulo, e nenhuma tinha Esc, foco preso nem Enter para salvar. Os
// re-exports ficam para os imports do módulo continuarem valendo.
export { Field, Modal, ModalActions, fieldClass } from "@/components/ui";

/**
 * Os estados da Beleza, traduzidos para a régua de atenção do app.
 *
 * As cores moram em `components/ui/Attention`: este módulo inventou o padrão,
 * mas quem pinta é o app inteiro agora. Aqui fica só o de-para.
 */
const careLevel: Record<CareUrgency, AttentionLevel> = {
  ATRASADO: "atrasado",
  HOJE: "atencao",
  PROXIMO: "atencao",
  OK: "ok",
  SEM_DATA: "neutro",
};

/** Borda esquerda colorida do card, para bater o olho e ver o que está atrasado. */
export const urgencyBorder: Record<CareUrgency, string> = {
  ATRASADO: attentionBorder.atrasado,
  HOJE: attentionBorder.atencao,
  PROXIMO: attentionBorder.atencao,
  OK: attentionBorder.ok,
  SEM_DATA: attentionBorder.neutro,
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
    <AttentionBadge level={careLevel[urgency]} className="px-2.5 text-xs">
      {urgencyLabel(urgency, days)}
    </AttentionBadge>
  );
}

const expiryLevel: Record<ExpiryStatus, AttentionLevel> = {
  VENCIDO: "atrasado",
  URGENTE: "atrasado",
  PROXIMO: "atencao",
  OK: "ok",
  SEM_VALIDADE: "neutro",
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
    <AttentionBadge level={expiryLevel[status]} className="px-2.5 text-xs">
      {expiryLabel(status, days)}
    </AttentionBadge>
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
