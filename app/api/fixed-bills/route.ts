import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { fixedBillSchema } from "@/lib/schemas";
import { unpaidStatus, utcDate } from "@/lib/finance-calc";
import { todayUtc } from "@/lib/utils";

export const POST = route(async (request: Request) => {
  const { name, amount, dueDay, type, paymentMethod, notes } = await parseBody(
    request,
    fixedBillSchema,
  );

  const today = todayUtc();
  const month = today.getUTCMonth() + 1;
  const year = today.getUTCFullYear();
  const dueDate = utcDate(year, month, dueDay);

  // Ja cria o log do mes corrente para a conta aparecer na lista na hora.
  const bill = await prisma.fixedBill.create({
    data: {
      name,
      amount,
      dueDay,
      type,
      paymentMethod,
      notes,
      monthlyLogs: {
        create: { month, year, dueDate, status: unpaidStatus(dueDate) },
      },
    },
  });

  return NextResponse.json(bill);
});
