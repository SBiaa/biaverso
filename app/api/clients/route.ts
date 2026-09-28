import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { clientCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const { businessId, businessIds, status, source, ...data } = await parseBody(
    request,
    clientCreateSchema,
  );

  // Os dois formatos entram aqui: o form dentro do negócio manda `businessId`,
  // o cadastro global manda `businessIds`. O Set evita vínculo duplicado quando
  // o mesmo negócio vem pelos dois campos.
  const linked = [...new Set([...(businessIds ?? []), ...(businessId ? [businessId] : [])])];

  const client = await prisma.client.create({
    data: {
      ...data,
      businessLinks: {
        create: linked.map((id) => ({
          businessId: id,
          status: status ?? "ATIVO",
          prospectStage: status === "PROSPECT" ? "NOVO_CONTATO" : undefined,
          source: source ?? undefined,
        })),
      },
    },
    include: { businessLinks: true },
  });

  return NextResponse.json(client);
});
