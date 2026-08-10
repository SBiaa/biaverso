import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { habitCreateSchema } from "@/lib/schemas";

export const GET = route(async () => {
  const habits = await prisma.habit.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, active: true },
  });
  return NextResponse.json(habits);
});

export const POST = route(async (request: Request) => {
  const { name } = await parseBody(request, habitCreateSchema);
  return NextResponse.json(await prisma.habit.create({ data: { name } }));
});
