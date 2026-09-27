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
