import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/session";

/**
 * Porta de entrada do app inteiro.
 *
 * O biaVerso guarda cofre de senhas, finanças e dados de clientes. Toda
 * requisição precisa de um cookie de sessão válido, que só a tela de login
 * entrega (ver `lib/session.ts`). Sem ele:
 * - páginas vão para `/login`, lembrando de onde vieram;
 * - API e server actions recebem 401, porque redirecionar um `fetch` para uma
 *   página HTML só esconderia o erro.
 *
 * Sem `APP_PASSWORD` o app fica aberto em desenvolvimento e responde 503 em
 * produção, para não subir aberto por esquecimento.
 */

/** Abertas sem login: a própria tela e o manifesto do PWA (o celular busca
 *  o ícone antes de existir sessão). */
function isPublic(pathname: string) {
  return pathname === "/login" || pathname === "/manifest.webmanifest";
}

export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  const { pathname, search } = request.nextUrl;

  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();

    return new NextResponse(
      "APP_PASSWORD não está definida. O app não sobe sem senha em produção.",
      { status: 503 },
    );
  }

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSessionToken(token, password)) return NextResponse.next();

  const isPageVisit =
    request.method === "GET" && !pathname.startsWith("/api/");

  if (!isPageVisit) {
    return NextResponse.json(
      { error: "Sessão expirada. Entre de novo." },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("de", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Tudo, menos os assets estáticos do Next e arquivos de imagem em /public.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
