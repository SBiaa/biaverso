import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { businessPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { modules, ...data } = await parseBody(request, businessPatchSchema);

  // Módulo ausente do payload é desligado, não apagado: os dados dele ficam no
  // banco e voltam a aparecer se o módulo for religado.
  if (modules) {
    await prisma.$transaction([
      prisma.businessModule.updateMany({
        where: { businessId: id, module: { notIn: modules } },
        data: { active: false },
      }),
      ...modules.map((module, order) =>
        prisma.businessModule.upsert({
          where: { businessId_module: { businessId: id, module } },
          create: { businessId: id, module, order },
          update: { active: true, order },
        }),
      ),
    ]);
  }

  return NextResponse.json(await prisma.business.update({ where: { id }, data }));
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Projetos, vinculos de cliente, posts e tarefas de producao do negocio somem
  // junto (onDelete: Cascade), assim como modulos, pedidos e colecoes.
  // Transacoes e ideias soltam o vinculo (SetNull).
  await prisma.business.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
