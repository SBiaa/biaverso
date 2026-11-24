import { addUtcDays, todayUtc } from "./utils";

export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const WEEKDAY_LABELS_LONG = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

// Segunda = 0, domingo = 6.
export function weekdayIndex(date: Date) {
  return (date.getUTCDay() + 6) % 7;
}

export function getWeekStart(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - weekdayIndex(start));
  return start;
}

/**
 * A segunda-feira da semana de hoje. Roda igual no servidor e no navegador
 * (`todayUtc` usa o fuso do app), então a tela consegue perceber sozinha que
 * virou a semana enquanto ela estava aberta.
 */
export function currentWeekStartISO() {
  return getWeekStart(todayUtc()).toISOString();
}

/** Posição de hoje (0–6) dentro da semana dada; -1 se hoje não é dela. */
export function todayIndexInWeek(weekStartISO: string) {
  const today = todayUtc();
  return getWeekStart(today).toISOString() === weekStartISO
    ? weekdayIndex(today)
    : -1;
}

const monthFormat = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

/** "10 a 16 de agosto" — ou com os dois meses, quando a semana vira o mês. */
export function formatWeekRange(weekStart: Date) {
  const end = addUtcDays(weekStart, 6);
  const sameMonth = weekStart.getUTCMonth() === end.getUTCMonth();

  return sameMonth
    ? `${weekStart.getUTCDate()} a ${end.getUTCDate()} de ${monthFormat.format(end)}`
    : `${weekStart.getUTCDate()} de ${monthFormat.format(weekStart)} a ${end.getUTCDate()} de ${monthFormat.format(end)}`;
}
