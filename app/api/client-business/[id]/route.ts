import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { clientBusinessPatchSchema } from "@/lib/schemas";
import { logProspectEvent } from "@/lib/prospect";
import { prospectStageLabels } from "@/lib/labels";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, clientBusinessPatchSchema);

  const before = await prisma.clientBusiness.findUnique({
    where: { id },
    select: { status: true, prospectStage: true },
  });
  const link = await prisma.clientBusiness.update({ where: { id }, data });

  // A linha do tempo do prospect registra sozinha as mudanças de etapa e o
  // desfecho, venham do quadro, da lista ou da página do cliente.
  if (before) {
    if (data.status && data.status !== before.status) {
      if (before.status === "PROSPECT" && data.status === "ATIVO") {
        await logProspectEvent(id, "Virou cliente 🎉");
      } else if (before.status === "PROSPECT" && data.status === "INATIVO") {
        await logProspectEvent(
          id,
          data.lostReason ? `Perdido: ${data.lostReason}` : "Marcado como perdido",
        );
      }
    } else if (
      data.prospectStage &&
      data.prospectStage !== before.prospectStage &&
      before.status === "PROSPECT"
    ) {
      await logProspectEvent(id, `Etapa: ${prospectStageLabels[data.prospectStage]}`);
    }
  }

  return NextResponse.json(link);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.clientBusiness.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
