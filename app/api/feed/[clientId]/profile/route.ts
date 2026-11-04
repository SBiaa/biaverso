import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { instagramProfileSchema } from "@/lib/schemas";

type Params = { params: Promise<{ clientId: string }> };

/** Cabeçalho do perfil: cria na primeira vez, depois só atualiza. */
export const PUT = route(async (request: Request, { params }: Params) => {
  const { clientId } = await params;
  const data = await parseBody(request, instagramProfileSchema);
  const profile = await prisma.instagramProfile.upsert({
    where: { clientId },
    create: { clientId, ...data },
    update: data,
  });
  return NextResponse.json(profile);
});
