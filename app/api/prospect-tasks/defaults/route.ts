import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { prospectTaskDefaultsSchema } from "@/lib/schemas";
import { DEFAULT_STEPS } from "@/lib/prospect-shared";

/** Monta o checklist padrão. Só cria o que ainda não existe, então pode repetir. */
export const POST = route(async (request: Request) => {
  const { clientBusinessId } = await parseBody(request, prospectTaskDefaultsSchema);

  const existing = await prisma.prospectTask.findMany({
    where: { clientBusinessId },
    select: { key: true, order: true },
  });
  const have = new Set(existing.map((t) => t.key));
  let order = existing.reduce((max, t) => Math.max(max, t.order), -1) + 1;

  const missing = DEFAULT_STEPS.filter((s) => !have.has(s.key));
  await prisma.prospectTask.createMany({
    data: missing.map((s) => ({
      clientBusinessId,
      key: s.key,
      title: s.title,
      order: order++,
    })),
  });

  return NextResponse.json({ created: missing.length });
});
