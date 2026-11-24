import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { passwordSchema } from "@/lib/schemas";
import { encrypt } from "@/lib/crypto";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, passwordSchema);

  // `omit`: a senha não volta na resposta. Quem chama só precisa do id para
  // vincular, e o valor legível chega pelo render do servidor (ver
  // CredentialsPanel) — devolver a cifra aqui seria inútil e ainda a exporia.
  const entry = await prisma.passwordEntry.create({
    data: { ...data, password: encrypt(data.password) },
    omit: { password: true },
  });

  return NextResponse.json(entry);
});
