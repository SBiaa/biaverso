import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { spiritualStudyPatchSchema } from "@/lib/schemas";
import { todayUtc } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const patch = await parseBody(request, spiritualStudyPatchSchema);

  const current = await prisma.spiritualStudy.findUniqueOrThrow({ where: { id } });
  const nextStatus = patch.status ?? current.status;

  // A data de entrega acompanha o status em vez de ser digitada: marcar como
  // entregue carimba hoje, e desmarcar limpa. Sem isto, um estudo reaberto
  // continuaria dizendo que foi entregue numa data qualquer.
  const becameDelivered = nextStatus === "ENTREGUE" && current.status !== "ENTREGUE";
  const leftDelivered = nextStatus !== "ENTREGUE" && current.status === "ENTREGUE";

  const study = await prisma.spiritualStudy.update({
    where: { id },
    data: {
      ...patch,
      deliveredAt: becameDelivered ? todayUtc() : leftDelivered ? null : undefined,
    },
  });

  return NextResponse.json(study);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.spiritualStudy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
