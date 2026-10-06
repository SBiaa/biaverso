"use client";

import { useState } from "react";
import { hexToRgba } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { formatGoalValue, parseGoalAmount } from "@/lib/vision-shared";

export type PillOption = { value: string; label: string; color?: string };

/**
 * Select com cara de etiqueta do Notion: a cor do valor escolhido pinta a pílula.
 * Sem valor (`""`) mostra o placeholder em cinza.
 */
export function PillSelect({
  value,
  options,
  placeholder,
  ariaLabel,
  disabled,
  onChange,
}: {
  value: string;
  options: PillOption[];
  /** Quando existe, vira a primeira opção (valor vazio) — para campo opcional. */
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const current = options.find((o) => o.value === value);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className="max-w-[9rem] cursor-pointer rounded-full border border-transparent py-0.5 pl-2 pr-1 text-xs font-medium outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      style={
        current?.color
          ? { backgroundColor: hexToRgba(current.color, 0.14), color: current.color }
          : undefined
      }
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Célula numérica: mostra o número cru para editar ("1800") e entende "1.800",
 * "1,5" e "7k" ao sair do campo. Texto ilegível não grava — fica vermelho.
 */
export function AmountCell({
  value,
  ariaLabel,
  placeholder = "—",
  nullable = true,
  onCommit,
}: {
  value: number | null;
  ariaLabel: string;
  placeholder?: string;
  /** `false` quando vazio não faz sentido (o valor atual vira 0). */
  nullable?: boolean;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? "" : String(value).replace(".", ","));
  const [invalid, setInvalid] = useState(false);

  function commit() {
    const parsed = parseGoalAmount(text);
    if (parsed === undefined) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    const next = parsed === null && !nullable ? 0 : parsed;
    setText(next === null ? "" : String(next).replace(".", ","));
    if (next !== value) onCommit(next);
  }

  return (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        setInvalid(false);
      }}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      title="Ex.: 1800, 1.800, 7k"
      className={cn(
        "w-20 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-text-primary outline-none placeholder:text-text-secondary/60 hover:border-border focus:border-border focus:ring-2 focus:ring-accent",
        invalid && "border-red-500",
      )}
    />
  );
}

/** Data na célula: `<input type="date">` sem moldura até passar o mouse. */
export function DateCell({
  value,
  ariaLabel,
  onChange,
}: {
  /** ISO completo ou "YYYY-MM-DD"; `null` = sem prazo. */
  value: string | null;
  ariaLabel: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <input
      type="date"
      value={value ? value.slice(0, 10) : ""}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label={ariaLabel}
      className="rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-text-primary outline-none hover:border-border focus:border-border focus:ring-2 focus:ring-accent"
    />
  );
}

export function ProgressBar({ percent, color }: { percent: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-9 text-xs text-text-secondary">{percent}%</span>
    </div>
  );
}

/** "R$ 800 / R$ 20.000" quando há meta numérica; senão o texto antigo da meta. */
export function goalValueSummary(goal: {
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  target: string | null;
}) {
  if (goal.targetValue !== null && goal.targetValue > 0) {
    return `${formatGoalValue(goal.currentValue, goal.unit)} / ${formatGoalValue(goal.targetValue, goal.unit)}`;
  }
  return goal.target ?? "";
}
