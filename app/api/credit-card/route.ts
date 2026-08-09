import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CREDIT_CARD_ID } from "@/lib/finance";

export async function PUT(request: Request) {
  const { name, closingDay, dueDay } = await request.json();

  const card = await prisma.creditCard.upsert({
    where: { id: CREDIT_CARD_ID },
    create: {
      id: CREDIT_CARD_ID,
      name: name || "Cartão de crédito",
      closingDay: closingDay || null,
      dueDay,
    },
    update: {
      name: name || "Cartão de crédito",
      closingDay: closingDay || null,
      dueDay,
    },
  });

  return NextResponse.json(card);
}
