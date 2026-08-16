import { addUtcDays, todayUtc } from "@/lib/utils";

/**
 * Cálculos do módulo de beleza. Tudo aqui trabalha com data-calendário em
 * meia-noite UTC, o mesmo referencial do resto do app (ver APP_TIME_ZONE em
 * lib/utils) — contar "faltam N dias" em fuso local erraria o dia na virada.
 *
 * Pure helpers/constants compartilhados entre servidor e componentes "use
 * client" — este arquivo nunca pode importar "@/lib/prisma" (ver "@/lib/beleza").
 */

/** Dias inteiros de `from` até `to`. Negativo = `to` já passou. */
export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Soma meses a uma data-calendário. Dia que não existe no mês de destino gruda
 * no último dia dele: 31/01 + 1 mês = 28/02, não 03/03 como o `setUTCMonth` cru.
 */
export function addUtcMonths(date: Date, months: number) {
  const day = date.getUTCDate();
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
  const lastDayOfTarget = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDayOfTarget));
  return target;
}

/**
 * Validade derivada da abertura: só existe com os dois campos. Sem `pao`, o
 * `expiresAt` que veio do formulário vale (produto com validade impressa).
 */
export function computeExpiresAt(
  openedAt: Date | null | undefined,
  pao: number | null | undefined,
  fallback: Date | null | undefined = null,
) {
  if (openedAt && pao) return addUtcMonths(openedAt, pao);
  return fallback ?? null;
}

/** Próxima data de um cuidado feito hoje/na data informada. */
export function computeNextDueAt(lastDoneAt: Date, intervalDays: number) {
  return addUtcDays(lastDoneAt, intervalDays);
}

// ------------------------------------------------------------------ produtos

export type ExpiryStatus = "SEM_VALIDADE" | "OK" | "PROXIMO" | "URGENTE" | "VENCIDO";

/** Faixas do indicador de validade: >60 dias verde, 30–60 amarelo, <30 ou vencido vermelho. */
export function expiryStatus(
  expiresAt: Date | null,
  today: Date = todayUtc(),
): { status: ExpiryStatus; days: number | null } {
  if (!expiresAt) return { status: "SEM_VALIDADE", days: null };

  const days = daysBetween(today, expiresAt);
  if (days < 0) return { status: "VENCIDO", days };
  if (days < 30) return { status: "URGENTE", days };
  if (days <= 60) return { status: "PROXIMO", days };
  return { status: "OK", days };
}

/** Janela do card "Produtos vencendo" da home: validade em até 30 dias ou já vencida. */
export const EXPIRY_ALERT_DAYS = 30;

// ------------------------------------------------------------------ cuidados

export type CareUrgency = "SEM_DATA" | "ATRASADO" | "HOJE" | "PROXIMO" | "OK";

/** Quantos dias antes do vencimento o cuidado já aparece em amarelo. */
export const CARE_WARNING_DAYS = 3;

export function careUrgency(
  nextDueAt: Date | null,
  today: Date = todayUtc(),
): { urgency: CareUrgency; days: number | null } {
  if (!nextDueAt) return { urgency: "SEM_DATA", days: null };

  const days = daysBetween(today, nextDueAt);
  if (days < 0) return { urgency: "ATRASADO", days };
  if (days === 0) return { urgency: "HOJE", days };
  if (days <= CARE_WARNING_DAYS) return { urgency: "PROXIMO", days };
  return { urgency: "OK", days };
}

// --------------------------------------------------------------- cronogramas

/** Índice do passo seguinte — no fim do ciclo, volta ao começo. */
export function nextStepIndex(currentStep: number, totalSteps: number) {
  if (totalSteps <= 0) return 0;
  return (currentStep + 1) % totalSteps;
}

/**
 * `currentStep` gravado pode ter ficado fora do intervalo se passos foram
 * apagados depois. Normaliza em vez de devolver `undefined` para a tela.
 */
export function safeStepIndex(currentStep: number, totalSteps: number) {
  if (totalSteps <= 0) return 0;
  return ((currentStep % totalSteps) + totalSteps) % totalSteps;
}

type CycleStep = { id: string; intervalDays: number };
type CycleLog = { date: Date; stepId: string };

/**
 * Quando a etapa atual do ciclo cai. O intervalo que conta é o do passo que
 * *já foi feito* — "hidratação a cada 7 dias" quer dizer sete dias depois dela,
 * e é aí que a nutrição entra. Ciclo sem nenhum registro começa hoje.
 */
export function scheduleNextDate(
  steps: CycleStep[],
  lastLog: CycleLog | null,
  today: Date = todayUtc(),
): Date {
  if (!lastLog) return today;

  const doneStep = steps.find((s) => s.id === lastLog.stepId);
  const interval = doneStep?.intervalDays ?? 7;
  return addUtcDays(lastLog.date, interval);
}

// ------------------------------------------------------------------ rotinas

/** Ordem de exibição das rotinas do dia: manhã, noite, resto. */
export const ROUTINE_TIME_ORDER = ["MANHA", "NOITE", "QUALQUER"] as const;

export function sortRoutineTimes<T extends { timeOfDay: string; order: number }>(
  routines: T[],
) {
  return [...routines].sort((a, b) => {
    const byTime =
      ROUTINE_TIME_ORDER.indexOf(a.timeOfDay as (typeof ROUTINE_TIME_ORDER)[number]) -
      ROUTINE_TIME_ORDER.indexOf(b.timeOfDay as (typeof ROUTINE_TIME_ORDER)[number]);
    return byTime !== 0 ? byTime : a.order - b.order;
  });
}

// ------------------------------------------------------------------- views
// O formato que as telas recebem: datas já em string ISO e status já calculado,
// para os componentes "use client" não precisarem tocar em "@/lib/beleza".

export type RoutineStepView = {
  id: string;
  title: string;
  notes: string | null;
  order: number;
  productId: string | null;
  productName: string | null;
  /** Marcado na data mostrada. Sempre `false` na tela de gerenciamento. */
  done: boolean;
};

export type RoutineView = {
  id: string;
  name: string;
  timeOfDay: string;
  active: boolean;
  order: number;
  done: boolean;
  /** Passos marcáveis um a um; falso = lista numerada só de leitura. */
  checklist: boolean;
  steps: RoutineStepView[];
};

export type ScheduleStepView = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  intervalDays: number;
  productId: string | null;
  productName: string | null;
};

export type ScheduleView = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  currentStep: number;
  steps: ScheduleStepView[];
  /** Etapa da vez, já normalizada contra passos apagados. */
  currentStepIndex: number;
  nextDueAt: string | null;
  daysUntilNext: number | null;
  urgency: CareUrgency;
  history: { id: string; date: string; stepTitle: string; notes: string | null }[];
};

export type AppointmentView = {
  id: string;
  name: string;
  type: string;
  intervalDays: number;
  lastDoneAt: string | null;
  nextDueAt: string | null;
  notes: string | null;
  active: boolean;
  urgency: CareUrgency;
  daysUntilDue: number | null;
  history: { id: string; date: string; cost: number | null; notes: string | null }[];
};

export type ProductView = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  openedAt: string | null;
  expiresAt: string | null;
  pao: number | null;
  finished: boolean;
  finishedAt: string | null;
  runningLow: boolean;
  cost: number | null;
  notes: string | null;
  status: ExpiryStatus;
  daysUntilExpiry: number | null;
};

/** Opção de produto nos selects de passo de rotina/cronograma. */
export type ProductOption = { id: string; name: string; brand: string | null };
