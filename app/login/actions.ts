"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  createSessionToken,
  safeEqual,
  safeReturnPath,
} from "@/lib/session";

export type LoginState = { error: string | null };

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = process.env.APP_PASSWORD;
  const returnTo = safeReturnPath(formData.get("de"));

  // Sem senha configurada o proxy já deixa tudo aberto (só em dev).
  if (!password) redirect(returnTo);

  const given = formData.get("senha");
  const ok = typeof given === "string" && (await safeEqual(given, password));

  if (!ok) {
    // Um segundo de espera por tentativa errada: para a pessoa não muda nada,
    // para um robô testando senhas em sequência vira uma eternidade.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { error: "Senha errada. Tenta de novo." };
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  redirect(returnTo);
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
