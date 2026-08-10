import { NextResponse, type NextRequest } from "next/server";

/**
 * Basic Auth no app inteiro.
 *
 * O biaVerso guarda cofre de senhas, finanças e dados de clientes, e não tem
 * nenhuma noção de usuário — qualquer pessoa com a URL veria tudo e poderia
 * escrever pela API. Enquanto não existir login de verdade, uma senha única
 * fecha a porta.
 *
 * Ligue definindo `APP_PASSWORD` no ambiente (e, se quiser, `APP_USER`).
 * Com a variável definida, vale em qualquer ambiente. Sem ela, o app só roda
 * em desenvolvimento: em produção responde 503, para não subir aberto por
 * esquecimento.
 */

const REALM = 'Basic realm="biaVerso", charset="UTF-8"';

/** Compara digests de mesmo tamanho, sem sair no primeiro byte diferente. */
async function matches(received: string, expected: string) {
  const digest = async (value: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    );

  const [a, b] = await Promise.all([digest(received), digest(expected)]);

  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function unauthorized() {
  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

export async function middleware(request: NextRequest) {
  const password = process.env.APP_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();

    return new NextResponse(
      "APP_PASSWORD não está definida. O app não sobe sem senha em produção.",
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }

  // O usuário pode conter ":", a senha não é dividida: só o primeiro separa.
  const separator = decoded.indexOf(":");
  if (separator === -1) return unauthorized();

  const user = decoded.slice(0, separator);
  const givenPassword = decoded.slice(separator + 1);

  const [userOk, passwordOk] = await Promise.all([
    matches(user, process.env.APP_USER || "bia"),
    matches(givenPassword, password),
  ]);

  return userOk && passwordOk ? NextResponse.next() : unauthorized();
}

export const config = {
  matcher: [
    // Tudo, menos os assets estáticos do Next e arquivos de imagem em /public.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
