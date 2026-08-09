import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { dayId, mealType, eaten } = await request.json();

  const log = await prisma.mealLog.create({
    data: { dayId, mealType, eaten: eaten ?? true },
  });

  return NextResponse.json(log);
}
