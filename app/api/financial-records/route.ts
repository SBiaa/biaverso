import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, type, totalAmount, installments, dueDay, notes } =
    await request.json();

  const record = await prisma.financialRecord.create({
    data: {
      name,
      type,
      totalAmount,
      installments: installments || null,
      dueDay: dueDay || null,
      notes: notes || null,
      status: "EM_ABERTO",
    },
  });

  return NextResponse.json(record);
}
