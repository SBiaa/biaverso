import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { prospectTaskCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, prospectTaskCreateSchema);

  const last = await prisma.prospectTask.findFirst({
    where: { clientBusinessId: data.clientBusinessId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const task = await prisma.prospectTask.create({
    data: { ...data, order: (last?.order ?? -1) + 1 },
  });
  return NextResponse.json(task);
});
