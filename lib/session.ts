/**
 * Sessão de login: um cookie assinado, sem tabela no banco.
 *
 * O biaVerso tem uma usuária só e uma senha só (`APP_PASSWORD`). Depois de
 * acertar a senha na tela de login, o navegador recebe um cookie com a data de
 * validade e uma assinatura HMAC dessa data. Sem a chave, ninguém consegue
 * fabricar um cookie que passe.
 *
 * A chave sai da própria senha: trocar `APP_PASSWORD` derruba todas as sessões
 * abertas de uma vez, que é o que se quer quando a senha vaza.
 *
 * Usa só Web Crypto, então roda igual no `proxy.ts` e nas server actions.
 */

export const SESSION_COOKIE = "biaverso_sessao";
export const SESSION_DAYS = 30;

const VERSION = "v1";
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, password: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`biaverso-sessao:${password}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

/** Compara digests de mesmo tamanho, sem sair no primeiro byte diferente. */
export async function safeEqual(received: string, expected: string) {
  const digest = async (value: string) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

  const [a, b] = await Promise.all([digest(received), digest(expected)]);

  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createSessionToken(password: string) {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${VERSION}.${expiresAt}`;
  return `${payload}.${await sign(payload, password)}`;
}

export async function isValidSessionToken(
  token: string | undefined,
  password: string,
) {
  if (!token) return false;

  const [version, expiresAt, signature] = token.split(".");
  if (version !== VERSION || !expiresAt || !signature) return false;

  const expires = Number(expiresAt);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  return safeEqual(signature, await sign(`${version}.${expiresAt}`, password));
}

/**
 * Para onde voltar depois do login. Só caminhos internos: um `?de=//site.com`
 * viraria redirecionamento para fora do app.
 */
export function safeReturnPath(value: unknown) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  if (value === "/login" || value.startsWith("/login?")) return "/";
  return value;
}
