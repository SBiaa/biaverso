import { addUtcDays, todayUtc } from "@/lib/utils";

/**
 * Cálculos do módulo de ciclo. Tudo aqui trabalha com data-calendário em
 * meia-noite UTC, o mesmo referencial do resto do app (ver APP_TIME_ZONE em
 * lib/utils).
 *
 * A régua é a mesma de lib/astros.ts: fase do ciclo, previsão da próxima
 * menstruação, ovulação e janela fértil são conta, não dado — saem do
 * histórico de dias com fluxo registrado, calculadas na hora. Só o fato do dia
 * (fluxo, sintoma, humor) é gravado no banco.
 *
 * Pure helpers/tipos compartilhados entre servidor e componentes "use client"
 * — este arquivo nunca pode importar "@/lib/prisma" (ver "@/lib/ciclo").
 */

/** Dias inteiros de `from` até `to`. Negativo = `to` já passou. */
export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

// ------------------------------------------------------------------ períodos

export type Period = { start: Date; end: Date; length: number };

/**
 * Agrupa datas com fluxo registrado em períodos: dias em sequência (um após o
 * outro, sem furo) viram um único período. Um furo de um dia ou mais começa um
 * período novo — é o que separa "menstruação com uma pausa no meio" de "duas
 * menstruações", e sem essa régua o cálculo não teria como diferenciar.
 */
export function derivePeriods(flowDates: Date[]): Period[] {
  const sorted = [...flowDates].sort((a, b) => a.getTime() - b.getTime());
  const periods: Period[] = [];

  for (const date of sorted) {
    const last = periods[periods.length - 1];
    if (last && daysBetween(last.end, date) === 1) {
      last.end = date;
      last.length += 1;
    } else {
      periods.push({ start: date, end: date, length: 1 });
    }
  }

  return periods;
}

/** Quantos ciclos recentes entram na média — os últimos 6, como a maioria dos apps do gênero. */
const CYCLES_FOR_AVERAGE = 6;

/** Padrão usado até existir histórico (menos de dois períodos completos). */
export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;

/** Duração média da fase lútea — do dia da ovulação até a próxima menstruação. É a mais estável das duas metades do ciclo, por isso ancora a conta da ovulação. */
export const LUTEAL_PHASE_LENGTH = 14;

/** Média dos intervalos entre início de período, dos últimos `CYCLES_FOR_AVERAGE`. Precisa de pelo menos dois períodos para existir um intervalo. */
export function averageCycleLength(periods: Period[]): number | null {
  if (periods.length < 2) return null;

  const gaps: number[] = [];
  for (let i = 1; i < periods.length; i++) {
    gaps.push(daysBetween(periods[i - 1].start, periods[i].start));
  }
  const recent = gaps.slice(-CYCLES_FOR_AVERAGE);
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
}

/** Média da duração dos últimos `CYCLES_FOR_AVERAGE` períodos. */
export function averagePeriodLength(periods: Period[]): number | null {
  if (periods.length === 0) return null;

  const recent = periods.slice(-CYCLES_FOR_AVERAGE);
  return Math.round(recent.reduce((a, p) => a + p.length, 0) / recent.length);
}

// -------------------------------------------------------------------- ciclo

export type CyclePhase = "MENSTRUAL" | "FOLICULAR" | "OVULATORIA" | "LUTEA";

export type CycleNow = {
  /** Nenhum período registrado ainda — nada do resto abaixo pode ser calculado. */
  hasHistory: boolean;
  /** 1 = primeiro dia da última menstruação registrada. */
  cycleDay: number | null;
  phase: CyclePhase | null;
  /** Duração de ciclo usada na conta: a média real, ou o padrão de 28 dias. */
  cycleLength: number;
  periodLength: number;
  /** `true` enquanto a duração acima é só o padrão — menos de dois períodos registrados. */
  isEstimate: boolean;
  lastPeriodStart: Date | null;
  nextPeriodStart: Date | null;
  daysUntilNextPeriod: number | null;
  ovulationDate: Date | null;
  daysUntilOvulation: number | null;
  fertileWindowStart: Date | null;
  fertileWindowEnd: Date | null;
  inFertileWindow: boolean;
  /** A menstruação prevista já passou e nenhum período novo foi registrado. */
  isLate: boolean;
  daysLate: number | null;
};

/** O estado do ciclo numa data — dia do ciclo, fase, previsões. */
export function cycleNow(periods: Period[], today: Date = todayUtc()): CycleNow {
  const cycleLength = averageCycleLength(periods) ?? DEFAULT_CYCLE_LENGTH;
  const periodLength = averagePeriodLength(periods) ?? DEFAULT_PERIOD_LENGTH;
  const isEstimate = periods.length < 2;
  const lastPeriod = periods[periods.length - 1] ?? null;

  if (!lastPeriod) {
    return {
      hasHistory: false,
      cycleDay: null,
      phase: null,
      cycleLength,
      periodLength,
      isEstimate: true,
      lastPeriodStart: null,
      nextPeriodStart: null,
      daysUntilNextPeriod: null,
      ovulationDate: null,
      daysUntilOvulation: null,
      fertileWindowStart: null,
      fertileWindowEnd: null,
      inFertileWindow: false,
      isLate: false,
      daysLate: null,
    };
  }

  const cycleDay = daysBetween(lastPeriod.start, today) + 1;
  const nextPeriodStart = addUtcDays(lastPeriod.start, cycleLength);
  const ovulationDate = addUtcDays(lastPeriod.start, cycleLength - LUTEAL_PHASE_LENGTH);
  const fertileWindowStart = addUtcDays(ovulationDate, -5);
  const fertileWindowEnd = addUtcDays(ovulationDate, 1);
  const daysUntilNextPeriod = daysBetween(today, nextPeriodStart);
  const isLate = daysUntilNextPeriod < 0;

  const phase: CyclePhase =
    cycleDay <= periodLength
      ? "MENSTRUAL"
      : today < fertileWindowStart
        ? "FOLICULAR"
        : today <= fertileWindowEnd
          ? "OVULATORIA"
          : "LUTEA";

  return {
    hasHistory: true,
    cycleDay,
    phase,
    cycleLength,
    periodLength,
    isEstimate,
    lastPeriodStart: lastPeriod.start,
    nextPeriodStart,
    daysUntilNextPeriod,
    ovulationDate,
    daysUntilOvulation: daysBetween(today, ovulationDate),
    fertileWindowStart,
    fertileWindowEnd,
    inFertileWindow: today >= fertileWindowStart && today <= fertileWindowEnd,
    isLate,
    daysLate: isLate ? Math.abs(daysUntilNextPeriod) : null,
  };
}

// -------------------------------------------------------------- calendário

export type CyclePrediction = {
  periodStart: Date;
  periodEnd: Date;
  ovulationDate: Date;
  fertileStart: Date;
  fertileEnd: Date;
};

/**
 * Períodos, ovulação e janela fértil previstos para a frente, um por ciclo,
 * até a data `until`. Usado para pintar o calendário além do que já foi
 * registrado — sem isso o mês corrente só mostraria os dias já vividos.
 */
export function futurePredictions(
  cycleNowValue: CycleNow,
  until: Date,
  maxCycles = 6,
): CyclePrediction[] {
  if (!cycleNowValue.hasHistory || !cycleNowValue.lastPeriodStart) return [];

  const { lastPeriodStart, cycleLength, periodLength } = cycleNowValue;
  const predictions: CyclePrediction[] = [];

  for (let n = 1; n <= maxCycles; n++) {
    const periodStart = addUtcDays(lastPeriodStart, cycleLength * n);
    if (periodStart > until) break;

    const ovulationDate = addUtcDays(periodStart, cycleLength - LUTEAL_PHASE_LENGTH);
    predictions.push({
      periodStart,
      periodEnd: addUtcDays(periodStart, periodLength - 1),
      ovulationDate,
      fertileStart: addUtcDays(ovulationDate, -5),
      fertileEnd: addUtcDays(ovulationDate, 1),
    });
  }

  return predictions;
}

function isBetween(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

export type CalendarDayKind =
  | "PERIODO"
  | "PERIODO_PREVISTO"
  | "OVULACAO_PREVISTA"
  | "FERTIL_PREVISTO"
  | "NENHUM";

/**
 * O que pintar num dia do calendário: fluxo já registrado tem prioridade sobre
 * previsão — um período que veio adiantado ou atrasado não deve competir
 * visualmente com a data que a média esperava.
 */
export function calendarDayKind(
  date: Date,
  loggedFlowDates: ReadonlySet<number>,
  predictions: CyclePrediction[],
): CalendarDayKind {
  if (loggedFlowDates.has(date.getTime())) return "PERIODO";

  for (const p of predictions) {
    if (isBetween(date, p.periodStart, p.periodEnd)) return "PERIODO_PREVISTO";
  }
  for (const p of predictions) {
    if (date.getTime() === p.ovulationDate.getTime()) return "OVULACAO_PREVISTA";
  }
  for (const p of predictions) {
    if (isBetween(date, p.fertileStart, p.fertileEnd)) return "FERTIL_PREVISTO";
  }
  return "NENHUM";
}

// ------------------------------------------------------------------- views
// O formato que as telas recebem: datas já em string ISO, para os componentes
// "use client" não precisarem tocar em "@/lib/ciclo".

export type CycleLogView = {
  date: string;
  flow: string | null;
  symptoms: string[];
  mood: string | null;
  notes: string | null;
};

export type CycleNowView = {
  hasHistory: boolean;
  cycleDay: number | null;
  phase: CyclePhase | null;
  cycleLength: number;
  periodLength: number;
  isEstimate: boolean;
  nextPeriodStart: string | null;
  daysUntilNextPeriod: number | null;
  ovulationDate: string | null;
  daysUntilOvulation: number | null;
  fertileWindowStart: string | null;
  fertileWindowEnd: string | null;
  inFertileWindow: boolean;
  isLate: boolean;
  daysLate: number | null;
};

export function toCycleNowView(value: CycleNow): CycleNowView {
  return {
    hasHistory: value.hasHistory,
    cycleDay: value.cycleDay,
    phase: value.phase,
    cycleLength: value.cycleLength,
    periodLength: value.periodLength,
    isEstimate: value.isEstimate,
    nextPeriodStart: value.nextPeriodStart?.toISOString() ?? null,
    daysUntilNextPeriod: value.daysUntilNextPeriod,
    ovulationDate: value.ovulationDate?.toISOString() ?? null,
    daysUntilOvulation: value.daysUntilOvulation,
    fertileWindowStart: value.fertileWindowStart?.toISOString() ?? null,
    fertileWindowEnd: value.fertileWindowEnd?.toISOString() ?? null,
    inFertileWindow: value.inFertileWindow,
    isLate: value.isLate,
    daysLate: value.daysLate,
  };
}

export type CalendarDayView = {
  date: string;
  day: number;
  kind: CalendarDayKind;
  isToday: boolean;
  /** O registro do dia, quando existe — a mesma forma que o modal de edição usa. */
  log: CycleLogView | null;
};

export type PeriodView = { start: string; end: string; length: number };
