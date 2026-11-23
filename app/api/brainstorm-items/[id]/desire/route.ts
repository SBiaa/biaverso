import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, route } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// "Mandar para Desejos": cria o desejo com o texto e o pilar do item.
export const POST = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const item = await prisma.$transaction(async (tx) => {
    const current = await tx.brainstormItem.findUniqueOrThrow({ where: { id } });
    if (current.desireId) throw new ApiError(409, "Esse item já está nos Desejos.");

    const desire = await tx.desire.create({
      data: { title: current.text, pillarId: current.pillarId },
    });
    return tx.brainstormItem.update({
      where: { id },
      data: { decision: "DESEJO", desireId: desire.id, organizedAt: new Date() },
    });
  });

  return NextResponse.json(item);
});
