import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  OAUTH_STATE_COOKIE,
  createOAuthClient,
  fetchAccountEmail,
} from "@/lib/google-calendar";
import { encrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

// Callback do OAuth: troca o código por tokens e guarda em GoogleAuth.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const settings = new URL("/configuracoes", url.origin);

  function fail(reason: string) {
    settings.searchParams.set("google", reason);
    const response = NextResponse.redirect(settings);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  }

  if (url.searchParams.get("error")) return fail("negado");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!state || !expectedState || state !== expectedState) return fail("state");
  if (!code) return fail("erro");

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      // Sem refresh token não há como renovar depois. Acontece quando a conta já
      // autorizou o app antes; revogar o acesso na conta Google e reconectar resolve.
      return fail("sem_refresh");
    }

    client.setCredentials(tokens);

    const email = await fetchAccountEmail(client).catch(() => null);

    // Conexão única: a nova substitui a anterior. Os dois tokens vão cifrados:
    // com eles em mãos qualquer um lê e escreve na agenda dela.
    await prisma.googleAuth.deleteMany({});
    await prisma.googleAuth.create({
      data: {
        email,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3_600_000),
      },
    });

    settings.searchParams.set("google", "conectado");
    const response = NextResponse.redirect(settings);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch {
    return fail("erro");
  }
}
