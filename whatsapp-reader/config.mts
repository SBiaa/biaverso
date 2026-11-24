/**
 * Ajustes do leitor. O que muda de pessoa para pessoa mora aqui, ou no `.env`.
 */

/** Pasta com a sessão do WhatsApp. Quem tem estes arquivos TEM a sua conta. */
export const AUTH_DIR = ".whatsapp-auth";

/** Por quantos dias a mensagem fica no banco. O plano grátis do Neon é pequeno. */
export const RETENTION_DAYS = 30;

/**
 * Palavras que marcam uma mensagem como importante. É um ponto de partida: a
 * lista de verdade é a que você disser. Para trocar sem mexer no código, defina
 * `WHATSAPP_KEYWORDS` no `.env`, separando por vírgula.
 */
const DEFAULT_KEYWORDS = [
  "urgente",
  "prazo",
  "orçamento",
  "proposta",
  "contrato",
  "pagamento",
  "pix",
  "nota fiscal",
  "reunião",
  "R$",
];

export function keywords() {
  const fromEnv = process.env.WHATSAPP_KEYWORDS;
  if (!fromEnv?.trim()) return DEFAULT_KEYWORDS;
  return fromEnv.split(",").map((w) => w.trim()).filter(Boolean);
}
