import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { projectTaskCreateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { title, dueDate } = await parseBody(request, projectTaskCreateSchema);

  const project = await prisma.project.findUniqueOrThrow({ where: { id } });

  const task = await prisma.task.create({
    data: {
      title,
      type: "AVULSA",
      dueDate: dueDate ?? null,
      projectId: project.id,
      businessId: project.businessId,
    },
  });

  return NextResponse.json(task);
});
