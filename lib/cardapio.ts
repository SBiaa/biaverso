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
