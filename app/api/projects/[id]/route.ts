import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { projectPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const patch = await parseBody(request, projectPatchSchema);

  // `null` explícito limpa a data; campo ausente não mexe. Antes as duas
  // situações viravam `undefined` e era impossível apagar uma data.
  const project = await prisma.project.update({
    where: { id },
    data: {
      name: patch.name,
      description: patch.description,
      status: patch.status,
      startDate: patch.startDate,
      endDate: patch.endDate,
    },
  });

  return NextResponse.json(project);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Posts, tarefas de produção e tarefas do dia soltam o vínculo (onDelete: SetNull).
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
