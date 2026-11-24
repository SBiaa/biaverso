import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { waterLogSchema } from "@/lib/schemas";
import { getUserSettings } from "@/lib/settings";

export const PUT = route(async (request: Request) => {
  const { dayId, count } = await parseBody(request, waterLogSchema);
  // O volume de cada marcação é o configurado nas preferências, não os 300ml
  // fixos do default da coluna.
  const { waterUnitMl } = await getUserSettings();

  // Roda numa transacao: dois cliques rapidos nao podem ler a mesma contagem e
  // gravar em cima um do outro. `count` e validado >= 0, entao o slice abaixo
  // nunca corta a partir do fim da lista.
  await prisma.$transaction(async (tx) => {
    const current = await tx.waterLog.findMany({
      where: { dayId },
      orderBy: { loggedAt: "asc" },
      select: { id: true },
    });

    if (count > current.length) {
      await tx.waterLog.createMany({
        data: Array.from({ length: count - current.length }, () => ({
          dayId,
          amount: waterUnitMl,
        })),
      });
    } else if (count < current.length) {
      await tx.waterLog.deleteMany({
        where: { id: { in: current.slice(count).map((log) => log.id) } },
      });
    }
  });

  return NextResponse.json({ count });
});
