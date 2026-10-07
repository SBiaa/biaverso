import { prisma } from "@/lib/prisma";
import { prospectStageLabels } from "@/lib/labels";
import { advancedStage, stepEffect } from "@/lib/prospect-shared";
import { todayUtc } from "@/lib/utils";
import type { ProspectStage } from "@/app/generated/prisma/client";

/** Registro automático na linha do tempo do prospect. */
export async function logProspectEvent(clientBusinessId: string, text: string) {
  await prisma.prospectNote.create({ data: { clientBusinessId, text, kind: "EVENTO" } });
}

/**
 * Concluir um passo padrão mexe no vínculo: grava o último contato e, se for o
 * caso, avança a etapa. Passo próprio (sem `key`) não mexe em nada.
 */
export async function applyStepDone(clientBusinessId: string, key: string | null) {
  const effect = stepEffect(key);
  if (!effect) return;

  const link = await prisma.clientBusiness.findUnique({
    where: { id: clientBusinessId },
    select: { status: true, prospectStage: true },
  });
  if (!link || link.status !== "PROSPECT") return;

  const stage = advancedStage(link.prospectStage, effect.advanceTo) as ProspectStage | null;
  if (!effect.contact && !stage) return;

  await prisma.clientBusiness.update({
    where: { id: clientBusinessId },
    data: {
      ...(effect.contact ? { lastContactAt: todayUtc() } : {}),
      ...(stage ? { prospectStage: stage } : {}),
    },
  });
  if (stage) {
    await logProspectEvent(clientBusinessId, `Etapa: ${prospectStageLabels[stage]}`);
  }
}
