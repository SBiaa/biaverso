import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { passwordPatchSchema } from "@/lib/schemas";
import { encrypt } from "@/lib/crypto";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, passwordPatchSchema);

  const entry = await prisma.passwordEntry.update({
    where: { id },
    // Campo ausente = "não mexe", então só cifra quando a senha veio de fato.
    data:
      data.password === undefined
        ? data
        : { ...data, password: encrypt(data.password) },
    // A senha não volta na resposta — ver o POST em ../route.ts.
    omit: { password: true },
  });

  return NextResponse.json(entry);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.passwordEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
