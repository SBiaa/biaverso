/**
 * O `pg` hoje trata `sslmode=prefer|require|verify-ca` como `verify-full`
 * (valida certificado e hostname) e avisa a cada conexão que, na próxima
 * versão grande, esses modos vão ficar mais fracos. Trocar por `verify-full`
 * mantém exatamente o comportamento de hoje e cala o aviso.
 *
 * Feito aqui e não só na variável de ambiente porque o DATABASE_URL da Vercel
 * é "sensitive" (não dá para ler de volta) e o .env de cada máquina pode estar
 * com o valor antigo.
 */
const WEAK_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

export function withStrictSsl(url: string | undefined): string | undefined {
  if (!url) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url; // Formato estranho: deixa o `pg` reclamar como sempre.
  }
  const mode = parsed.searchParams.get("sslmode");
  if (!mode || !WEAK_SSL_MODES.has(mode)) return url;
  parsed.searchParams.set("sslmode", "verify-full");
  return parsed.toString();
}
