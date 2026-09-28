// Tipos e helpers puros do controle de horas, compartilhados entre o servidor
// e os componentes "use client" — este arquivo nunca importa "@/lib/prisma".

import { APP_TIME_ZONE } from "@/lib/utils";

export type ActivityCategoryDTO = {
  id: string;
  name: string;
  color: string;
  active: boolean;
};

export type TimeBlockDTO = {
  id: string;
  title: string | null;
  startTime: string;
  endTime: string;
  categoryId: string;
};

export type TimeEntryDTO = {
  id: string;
  title: string | null;
  startedAt: string;
  endedAt: string | null;
  categoryId: string;
};

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Instante ISO → "HH:mm" no fuso do app, para exibição. */
export function formatInstantTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** Instante ISO → minutos desde a meia-noite, no fuso do app — para posicionar na timeline. */
export function instantToMinutes(iso: string): number {
  return timeToMinutes(formatInstantTime(iso));
}

/** Duração em minutos. Sem `endedAt` (registro em andamento), usa o instante atual. */
export function minutesBetween(startedAt: string, endedAt: string | null): number {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  return Math.max(0, (end - start) / 60_000);
}

/** Soma os minutos realizados por categoria — alimenta o resumo do dia. */
export function totalMinutesByCategory(entries: TimeEntryDTO[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const minutes = minutesBetween(entry.startedAt, entry.endedAt);
    totals.set(entry.categoryId, (totals.get(entry.categoryId) ?? 0) + minutes);
  }
  return totals;
}

// Zoom do calendário de blocos planejados. Fica aqui (e não no componente
// "use client" que o usa) porque a página de servidor também precisa de
// `daysForView` — um export de um módulo "use client" não pode ser chamado
// do servidor, só passado como prop.
export const CALENDAR_VIEWS = [
  { value: "dia", label: "Dia", days: 1 },
  { value: "3dias", label: "3 dias", days: 3 },
  { value: "semana", label: "Semana", days: 7 },
] as const;

export type CalendarViewMode = (typeof CALENDAR_VIEWS)[number]["value"];

export function daysForView(view: CalendarViewMode) {
  return CALENDAR_VIEWS.find((v) => v.value === view)?.days ?? 7;
}
