// Helpers puros da Central de Visão — rodam no servidor e nos componentes
// "use client"; nunca importam "@/lib/prisma".

type GoalAmounts = {
  targetValue: number | null;
  currentValue: number;
  /** Percentual digitado à mão: só vale para objetivo sem meta numérica. */
  progress: number;
};

/**
 * Percentual de um objetivo metrificado. Com meta numérica é valor atual ÷ meta
 * (passar da meta vale 100%); sem ela, o percentual que foi digitado à mão.
 */
export function goalProgress(goal: GoalAmounts): number {
  const raw =
    goal.targetValue !== null && goal.targetValue > 0
      ? (goal.currentValue / goal.targetValue) * 100
      : goal.progress;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** 1800 + "R$" → "R$ 1.800"; 90 + "canecas" → "90 canecas". */
export function formatGoalValue(value: number, unit: string | null): string {
  const text = numberFormat.format(value);
  if (!unit) return text;
  return unit === "R$" ? `R$ ${text}` : `${text} ${unit}`;
}

/**
 * Entende o que ela digita numa célula de valor: "1800", "1.800", "1,5", "7k".
 * Vazio → `null` (sem valor); ilegível → `undefined`, para a tela avisar em vez
 * de gravar lixo.
 */
export function parseGoalAmount(input: string): number | null | undefined {
  const text = input.trim().toLowerCase().replace(/\s/g, "");
  if (text === "") return null;

  const match = text.match(/^(\d+(?:[.,]\d+)*)(k|mil)?$/);
  if (!match) return undefined;

  let digits = match[1];
  // "1.800" (milhar) vs "1.5" (decimal): ponto/vírgula seguido de exatamente
  // 3 dígitos é separador de milhar; senão é decimal.
  if (/^\d{1,3}([.,]\d{3})+$/.test(digits)) digits = digits.replace(/[.,]/g, "");
  else digits = digits.replace(",", ".");

  const value = Number(digits) * (match[2] ? 1000 : 1);
  return Number.isFinite(value) ? value : undefined;
}
