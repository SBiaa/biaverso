import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { getAllRoutines } from "@/lib/beleza";
import { careRoutineCreateSchema } from "@/lib/schemas";

export const GET = route(async () => {
  return NextResponse.json(await getAllRoutines());
});

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, careRoutineCreateSchema);

  // Rotina nova entra no fim da lista.
  const count = await prisma.careRoutine.count();

  return NextResponse.json(
    await prisma.careRoutine.create({ data: { ...data, order: count } }),
  );
});
