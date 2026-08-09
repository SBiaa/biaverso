import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayUtc, unpaidStatus, utcDate } from "@/lib/finance-calc";

export async function POST(request: Request) {
  const { name, amount, dueDay, type, notes } = await request.json();

  const today = todayUtc();
  const month = today.getUTCMonth() + 1;
  const year = today.getUTCFullYear();
  const dueDate = utcDate(year, month, dueDay);

  // Já cria o log do mês corrente para a conta aparecer na lista na hora.
  const bill = await prisma.fixedBill.create({
    data: {
      name,
      amount,
      dueDay,
      type,
      notes: notes || null,
      monthlyLogs: {
        create: { month, year, dueDate, status: unpaidStatus(dueDate) },
      },
    },
  });

  return NextResponse.json(bill);
}
