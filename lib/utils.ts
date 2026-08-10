type ClassValue = string | false | null | undefined;

/**
 * Fuso de referência do app. Toda data-calendário (dia, vencimento, prazo) é
 * gravada como meia-noite UTC do dia correspondente neste fuso — o mesmo
 * referencial que <input type="date"> produz. Formatar ou filtrar essas datas
 * em fuso local mostraria/contaria o dia errado, então tudo aqui usa UTC.
 */
export const APP_TIME_ZONE = "America/Sao_Paulo";

export function cn(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrencyBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateBR(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateLongBR(date: Date) {
  const formatted = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Valor para <input type="date"> a partir de uma data-calendário.
export function toDateInputValue(date: string | Date) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Valor de hoje para <input type="date">. */
export function todayInputValue() {
  return toDateInputValue(todayUtc());
}

/**
 * "YYYY-MM-DD" → meia-noite UTC. Devolve null se a string não for uma data válida,
 * para que query params inventados virem fallback em vez de 500.
 */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejeita datas que "transbordam" (ex.: 2026-02-31 viraria 03/03).
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

/**
 * O dia de calendário de hoje no fuso do app, como meia-noite UTC — o mesmo
 * referencial em que <input type="date"> grava. Não depende do TZ do servidor,
 * então roda igual na sua máquina e na Vercel (que usa UTC).
 */
export function todayUtc() {
  return parseDateOnly(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  )!;
}

export function dayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

/** Primeiro dia do mês (inclusive) e do mês seguinte (exclusive), em UTC. */
export function getMonthRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}

/** Dia seguinte, em UTC — para montar intervalos `lt` a partir de uma data final. */
export function nextUtcDay(date: Date) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

/**
 * Lê um inteiro de query param dentro de um intervalo. Devolve null se veio lixo
 * ("?month=abc"), para o chamador usar o fallback em vez de mandar NaN ao Prisma.
 */
export function parseIntParam(
  value: string | undefined,
  min: number,
  max: number,
): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
}

export function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

const MONTH_NAMES_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatMonthYearBR(month: number, year: number) {
  return `${MONTH_NAMES_BR[month - 1]} de ${year}`;
}

export function monthNameBR(month: number) {
  return MONTH_NAMES_BR[month - 1];
}

export function colorFromString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]];
  return initials.map((p) => p[0]?.toUpperCase() ?? "").join("");
}
