/**
 * Regras puras do registro de uso, usadas no navegador e no servidor.
 *
 * O registro guarda o *lugar* — a tela ou a rota — e nunca o que estava nele.
 * Por isso os ids viram ":id" e as datas viram ":data": "/negocios/ckx…" e
 * "/negocios/cky…" são a mesma tela para a pergunta "que telas eu uso?".
 */

export const NAV_SOURCES = ["barra", "menu", "busca", "link", "direto"] as const;
export type NavSource = (typeof NAV_SOURCES)[number];

export const DEVICES = ["mobile", "desktop"] as const;
export type Device = (typeof DEVICES)[number];

const DATE_SEGMENT = /^\d{4}-\d{2}(-\d{2})?$/;
const NUMBER_SEGMENT = /^\d+$/;

/** Um segmento que é identificador de registro, não nome de tela. */
function looksLikeId(segment: string) {
  if (NUMBER_SEGMENT.test(segment)) return true;
  // cuid e uuid. Nomes de tela são palavras curtas, sem dígito no meio.
  return segment.length >= 16 && /\d/.test(segment);
}

/** "/negocios/ckx123?aba=x" → "/negocios/:id". */
export function normalizeUsagePath(raw: string) {
  const path = raw.split(/[?#]/)[0] || "/";
  const segments = path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (DATE_SEGMENT.test(segment)) return ":data";
      if (looksLikeId(segment)) return ":id";
      return segment.toLowerCase();
    });
  return "/" + segments.join("/");
}

/** Usado nas ações, em que o servidor só tem o user-agent para decidir. */
export function deviceFromUserAgent(userAgent: string | null): Device {
  return userAgent && /Mobi|Android|iPhone|iPad/i.test(userAgent) ? "mobile" : "desktop";
}
