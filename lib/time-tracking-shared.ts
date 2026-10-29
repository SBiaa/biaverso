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
  description: string | null;
  startedAt: string;
  endedAt: string | null;
  categoryId: string;
  projectId: string | null;
  taskId: string | null;
  /** Ciclo de foco do pomodoro: encerra sozinho quando o tempo acaba. */
  pomodoro: boolean;
};

/** Um projeto que dá para escolher no cronômetro ("Ace › Novo Milênio"). */
export type ProjectOptionDTO = {
  id: string;
  name: string;
  businessName: string;
  businessColor: string;
  clientName: string | null;
};

export type TaskOptionDTO = { id: string; title: string };

export type PomodoroSettingsDTO = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  sound: boolean;
};

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettingsDTO = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  sound: true,
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

/** Janela do dia em que "sem registro" conta: antes/depois disso não é cobrança. */
export const WORKDAY_START = "08:00";
export const WORKDAY_END = "22:00";

export type TimeStatusDTO = {
  categories: ActivityCategoryDTO[];
  /** Registros de hoje, o em andamento incluso (`endedAt: null`). */
  entries: TimeEntryDTO[];
  running: TimeEntryDTO | null;
  settings: PomodoroSettingsDTO;
  projects: ProjectOptionDTO[];
  /** Título das tarefas que os registros de hoje citam. */
  taskTitles: Record<string, string>;
  /** Ciclos de foco já encerrados hoje — decide quando a pausa é a longa. */
  pomodorosToday: number;
  windowStart: string;
  windowEnd: string;
};

/**
 * Horas de hoje a partir dos registros: `trackedMinutes` é tudo que foi
 * registrado; `untrackedMinutes` é o buraco entre o início da janela do dia e
 * agora que nenhum registro cobre (registros sobrepostos não contam em dobro).
 */
export function summarizeDay(
  entries: TimeEntryDTO[],
  windowStart: string,
  windowEnd: string,
  nowMs: number,
) {
  const trackedMinutes = entries.reduce(
    (sum, e) =>
      sum +
      Math.max(
        0,
        ((e.endedAt ? new Date(e.endedAt).getTime() : nowMs) -
          new Date(e.startedAt).getTime()) /
          60_000,
      ),
    0,
  );

  const from = new Date(windowStart).getTime();
  const to = Math.min(nowMs, new Date(windowEnd).getTime());
  if (to <= from) return { trackedMinutes, untrackedMinutes: 0 };

  const intervals = entries
    .map((e) => [
      Math.max(from, new Date(e.startedAt).getTime()),
      Math.min(to, e.endedAt ? new Date(e.endedAt).getTime() : nowMs),
    ])
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  let covered = 0;
  let cursor = from;
  for (const [start, end] of intervals) {
    const s = Math.max(start, cursor);
    if (end > s) {
      covered += end - s;
      cursor = end;
    }
  }

  return { trackedMinutes, untrackedMinutes: (to - from - covered) / 60_000 };
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
