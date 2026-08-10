import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { passwordSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, passwordSchema);

  // TODO: encrypt in v2 — v1 salva a senha em texto simples de proposito
  // (ver PasswordEntry.password no schema).
  return NextResponse.json(await prisma.passwordEntry.create({ data }));
});
