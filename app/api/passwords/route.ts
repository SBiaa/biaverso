import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, login, password, url, category, notes } = await request.json();

  // TODO: encrypt in v2 — v1 salva a senha em texto simples de propósito (ver PasswordEntry.password no schema).
  const entry = await prisma.passwordEntry.create({
    data: {
      name,
      login: login || null,
      password,
      url: url || null,
      category: category || "OUTRO",
      notes: notes || null,
    },
  });

  return NextResponse.json(entry);
}
