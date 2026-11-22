import { APP_TIME_ZONE } from "@/lib/utils";

/**
 * O destino "sem negócio" de uma ideia. Era "Pessoal" no filtro,
 * "Pessoal/Casa" no card e "Destino" na captura — três nomes para a mesma coisa.
 */
export const PESSOAL_LABEL = "Pessoal/Casa";

/** As abas de Ideias, na ordem em que aparecem. */
export const IDEA_TABS = [
  { status: "SOLTA", label: "Soltas" },
  { status: "EM_ANALISE", label: "Em análise" },
  { status: "VIROU_PROJETO", label: "Viraram projeto" },
  { status: "ARQUIVADA", label: "Arquivadas" },
] as const;

export type IdeaStatus = (typeof IDEA_TABS)[number]["status"];

/**
 * O dia (no fuso do app) de um instante, como número para subtrair. No fuso
 * de São Paulo e não no da máquina: o servidor roda em UTC e o navegador no
 * horário local, e cada um contaria "hoje" diferente perto da meia-noite.
 */
function dayNumber(date: Date): number {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(date);
  return Date.parse(`${ymd}T00:00:00Z`) / 86_400_000;
}

/** "hoje", "ontem", "há 5 dias"; passado um mês, a data. */
export function capturedLabel(createdAt: string, now = new Date()): string {
  const created = new Date(createdAt);
  const days = dayNumber(now) - dayNumber(created);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return created.toLocaleDateString("pt-BR", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
