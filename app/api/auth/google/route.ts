import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, buildConsentUrl } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

// Inicia o fluxo OAuth: manda para a tela de consentimento do Google.
export async function GET(request: Request) {
  const settings = new URL("/configuracoes", new URL(request.url).origin);

  let consentUrl: string;
  let state: string;

  try {
    state = randomBytes(32).toString("hex");
    consentUrl = buildConsentUrl(state);
  } catch {
    // Credenciais não configuradas no .env — a tela explica o que fazer.
    settings.searchParams.set("google", "config");
    return NextResponse.redirect(settings);
  }

  const response = NextResponse.redirect(consentUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return response;
}
