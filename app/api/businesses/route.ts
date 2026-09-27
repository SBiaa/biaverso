import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { businessCreateSchema } from "@/lib/schemas";
import { DEFAULT_MODULES } from "@/lib/business-modules";

export const POST = route(async (request: Request) => {
  const { modules, ...data } = await parseBody(request, businessCreateSchema);

  // Sem módulo nenhum a página do negócio abriria sem abas, então quem não
  // escolhe nada começa com o mínimo.
  const chosen = modules?.length ? modules : DEFAULT_MODULES;

  return NextResponse.json(
    await prisma.business.create({
      data: {
        ...data,
        modules: {
          create: chosen.map((module, order) => ({ module, order })),
        },
      },
    }),
  );
});
