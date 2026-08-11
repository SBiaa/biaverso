import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { computeExpiresAt, toProductView } from "@/lib/beleza";
import { beautyProductPatchSchema } from "@/lib/schemas";
import { todayUtc } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, beautyProductPatchSchema);

  const current = await prisma.beautyProduct.findUniqueOrThrow({ where: { id } });

  // Mexer em abertura ou PAO recalcula a validade derivada; um PATCH que só
  // marca "acabou" não pode zerar a data que já estava lá.
  const touchesExpiry =
    data.openedAt !== undefined || data.pao !== undefined || data.expiresAt !== undefined;
  const openedAt = data.openedAt === undefined ? current.openedAt : data.openedAt;
  const pao = data.pao === undefined ? current.pao : data.pao;
  const expiresAt = data.expiresAt === undefined ? current.expiresAt : data.expiresAt;

  const product = await prisma.beautyProduct.update({
    where: { id },
    data: {
      ...data,
      ...(touchesExpiry ? { expiresAt: computeExpiresAt(openedAt, pao, expiresAt) } : {}),
      // "Marcar como acabado" carimba a data; desmarcar limpa.
      ...(data.finished === undefined
        ? {}
        : { finishedAt: data.finished ? todayUtc() : null }),
    },
  });

  return NextResponse.json(toProductView(product));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Passos de rotina e de cronograma que apontavam para ele só perdem o
  // vínculo (SetNull) — a rotina em si continua de pé.
  await prisma.beautyProduct.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
