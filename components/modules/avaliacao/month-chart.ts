/**
 * Geometria comum aos gráficos "um ponto por dia do mês" da revisão mensal.
 * Os dois (casa e humor) compartilham a mesma régua horizontal, então o dia 12
 * fica na mesma coluna num e noutro e dá para ler os dois empilhados.
 */
export const CHART_WIDTH = 640;
export const PLOT_LEFT = 30;
export const PLOT_RIGHT = CHART_WIDTH - 6;
export const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;

/** Largura de uma coluna (um dia). */
export function slotWidth(daysInMonth: number) {
  return PLOT_WIDTH / daysInMonth;
}

/** Centro horizontal da coluna do dia `day` (1..31). */
export function dayCenter(day: number, daysInMonth: number) {
  return PLOT_LEFT + (day - 0.5) * slotWidth(daysInMonth);
}

/** Quais dias ganham rótulo no eixo: de cinco em cinco, sem apertar. */
export function dayTicks(daysInMonth: number) {
  const ticks = [1];
  for (let d = 5; d <= daysInMonth; d += 5) ticks.push(d);
  return ticks;
}
