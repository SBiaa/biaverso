import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { creditCardSchema } from "@/lib/schemas";
import { CREDIT_CARD_ID } from "@/lib/finance";

export const PUT = route(async (request: Request) => {
  const { name, closingDay, dueDay } = await parseBody(request, creditCardSchema);
  const fields = {
    name: name ?? "Cartao de credito",
    closingDay: closingDay ?? null,
    dueDay,
  };

  const card = await prisma.creditCard.upsert({
    where: { id: CREDIT_CARD_ID },
    create: { id: CREDIT_CARD_ID, ...fields },
    update: fields,
  });

  return NextResponse.json(card);
});
