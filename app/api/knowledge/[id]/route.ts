import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { knowledgePatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const patch = await parseBody(request, knowledgePatchSchema);

  const current = await prisma.knowledge.findUniqueOrThrow({ where: { id } });
  const nextStatus = patch.status ?? current.status;

  // Mesma regra do Livro: virar "Estudado" grava a data; sair de "Estudado"
  // devolve a data de conclusão para nulo em vez de deixá-la presa.
  const becameStudied = nextStatus === "ESTUDADO" && current.status !== "ESTUDADO";
  const leftStudied = nextStatus !== "ESTUDADO" && current.status === "ESTUDADO";

  const knowledge = await prisma.knowledge.update({
    where: { id },
    data: {
      ...patch,
      startedAt: nextStatus === "ESTUDANDO" && !current.startedAt ? new Date() : undefined,
      finishedAt: becameStudied ? new Date() : leftStudied ? null : undefined,
    },
  });

  return NextResponse.json(knowledge);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.knowledge.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
