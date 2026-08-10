import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { taskCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const { title, origin, dayId, dueDate } = await parseBody(request, taskCreateSchema);

  const task = await prisma.task.create({
    data: { title, origin, dayId, dueDate: dueDate ?? null, type: "AVULSA" },
  });

  return NextResponse.json(task);
});
