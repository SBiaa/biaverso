import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, type, amount, date, businessId, category, payMethod, notes } =
    await request.json();

  const transaction = await prisma.transaction.create({
    data: {
      name,
      type,
      amount,
      date: new Date(date),
      businessId: businessId || null,
      category,
      payMethod: payMethod || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(transaction);
}
