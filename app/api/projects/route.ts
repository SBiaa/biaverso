import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { projectCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, projectCreateSchema);

  const project = await prisma.project.create({
    data: {
      ...data,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      clientId: data.clientId ?? null,
    },
  });

  return NextResponse.json(project);
});
