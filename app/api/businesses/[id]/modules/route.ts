import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { businessModulesPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const modules = await prisma.businessModule.findMany({
    where: { businessId: id },
    orderBy: { order: "asc" },
    select: { module: true, active: true, order: true },
  });

  return NextResponse.json(modules);
});

/**
 * Substitui a lista inteira: a posição no array vira `order`, e o que não vier
 * é apagado. Desativar (`active: false`) não apaga nada do módulo — os pedidos,
 * coleções e projetos continuam no banco, só somem das abas.
 */
export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { modules } = await parseBody(request, businessModulesPatchSchema);

  await prisma.$transaction([
    prisma.businessModule.deleteMany({
      where: { businessId: id, module: { notIn: modules.map((m) => m.module) } },
    }),
    ...modules.map((m, order) =>
      prisma.businessModule.upsert({
        where: { businessId_module: { businessId: id, module: m.module } },
        create: { businessId: id, module: m.module, active: m.active, order },
        update: { active: m.active, order },
      }),
    ),
  ]);

  return NextResponse.json(
    await prisma.businessModule.findMany({
      where: { businessId: id },
      orderBy: { order: "asc" },
      select: { module: true, active: true, order: true },
    }),
  );
});
