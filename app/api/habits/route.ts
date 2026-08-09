import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const habits = await prisma.habit.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, active: true },
  });

  return NextResponse.json(habits);
}

export async function POST(request: Request) {
  const { name } = await request.json();

  const habit = await prisma.habit.create({
    data: { name },
  });

  return NextResponse.json(habit);
}
