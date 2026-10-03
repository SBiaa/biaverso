// Tipos e helpers puros do plano do dia (prioridade + tempo estimado). Roda no
// servidor e nos componentes "use client" — nunca importa "@/lib/prisma".

export type PriorityLevelDTO = {
  id: string;
  name: string;
  color: string;
  order: number;
};

/** 90 → "1h30", 45 → "45min", 120 → "2h". */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

/**
 * Entende o que ela digita: "45", "45min", "1h", "1h30", "1:30", "1,5h".
 * Número puro conta como minutos. Vazio → `null` (sem estimativa); texto que
 * não dá para entender → `undefined`, para a tela avisar em vez de gravar lixo.
 */
export function parseMinutes(input: string): number | null | undefined {
  const text = input.trim().toLowerCase().replace(",", ".");
  if (text === "") return null;

  const clock = text.match(/^(\d+):([0-5]?\d)$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]) || undefined;

  const parts = text.match(/^(?:(\d+(?:\.\d+)?)\s*h(?:oras?)?)?\s*(?:(\d+)\s*(?:m|min|minutos?)?)?$/);
  if (!parts || (parts[1] === undefined && parts[2] === undefined)) return undefined;

  const total = Math.round(Number(parts[1] ?? 0) * 60 + Number(parts[2] ?? 0));
  return total >= 1 && total <= 10080 ? total : undefined;
}
