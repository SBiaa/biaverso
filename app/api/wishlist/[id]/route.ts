import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { wishlistItemPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, wishlistItemPatchSchema);

  // Campo ausente sai do objeto no `.partial()`, e o Prisma ignora `undefined`
  // — então mandar só `status` mexe só no status.
  const item = await prisma.wishlistItem.update({
    where: { id },
    data: {
      ...data,
      // Sair de COMPRADO limpa os dados da compra, senão sobra data de um
      // "comprado" que não vale mais.
      ...(data.status && data.status !== "COMPRADO"
        ? { boughtAt: null, boughtPrice: null }
        : {}),
    },
  });

  return NextResponse.json(item);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.wishlistItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
