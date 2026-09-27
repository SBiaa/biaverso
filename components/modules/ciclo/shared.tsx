import { cn } from "@/lib/utils";
import type { CalendarDayKind, CyclePhase } from "@/lib/ciclo-shared";

// A mesma paleta do resto do app (ver components/ui/Attention): nada de cor
// nova só para este módulo, só um de-para do que o ciclo significa.

export const phasePillClass: Record<CyclePhase, string> = {
  MENSTRUAL: "bg-danger-soft-bg text-danger-soft-text",
  FOLICULAR: "bg-accent/10 text-accent",
  OVULATORIA: "bg-warning-soft-bg text-warning-soft-text",
  LUTEA: "bg-border text-text-secondary",
};

export const calendarDayClass: Record<CalendarDayKind, string> = {
  PERIODO: "bg-danger-solid-bg text-danger-solid-text",
  PERIODO_PREVISTO: "bg-danger-soft-bg text-danger-soft-text",
  OVULACAO_PREVISTA: "bg-warning-soft-bg text-warning-soft-text",
  FERTIL_PREVISTO: "bg-accent/10 text-accent",
  NENHUM: "text-text-primary",
};

export function PhasePill({ phase, label }: { phase: CyclePhase; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        phasePillClass[phase],
      )}
    >
      {label}
    </span>
  );
}

/** "em 3 dias", "hoje", "há 2 dias" — para previsão de próxima menstruação/ovulação. */
export function relativeDayLabel(days: number) {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  return days > 0 ? `em ${days} dias` : `há ${Math.abs(days)} dias`;
}
