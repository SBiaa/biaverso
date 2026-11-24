/**
 * Regras de tempo do quadro "Esperando você". Sem import de servidor, para o
 * mesmo código servir a página e, depois, qualquer componente de cliente.
 */

/** A partir de quando uma conversa sem resposta deixa de ser "normal". */
export const WAITING_WARN_HOURS = 4;
/** E a partir de quando vira atraso de verdade. */
export const WAITING_LATE_HOURS = 24;

export type WaitingTier = "ok" | "warn" | "late";

export function waitingTier(waitingMs: number): WaitingTier {
  const hours = waitingMs / 3_600_000;
  if (hours >= WAITING_LATE_HOURS) return "late";
  if (hours >= WAITING_WARN_HOURS) return "warn";
  return "ok";
}

/** "12 min", "3 h", "2 dias" — a precisão que dá para agir em cima. */
export function formatWaiting(waitingMs: number) {
  const minutes = Math.max(0, Math.floor(waitingMs / 60_000));
  if (minutes < 1) return "agora há pouco";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "1 dia" : `${days} dias`;
}
