import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { studyCoursePatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const patch = await parseBody(request, studyCoursePatchSchema);

  const current = await prisma.studyCourse.findUniqueOrThrow({ where: { id } });
  const nextStatus = patch.status ?? current.status;

  // Mesma regra do Conhecimento solto: virar "Estudado" grava a data; sair
  // dele devolve a data de conclusão para nulo.
  const becameStudied = nextStatus === "ESTUDADO" && current.status !== "ESTUDADO";
  const leftStudied = nextStatus !== "ESTUDADO" && current.status === "ESTUDADO";

  const course = await prisma.studyCourse.update({
    where: { id },
    data: {
      ...patch,
      startedAt: nextStatus === "ESTUDANDO" && !current.startedAt ? new Date() : undefined,
      finishedAt: becameStudied ? new Date() : leftStudied ? null : undefined,
    },
  });
  return NextResponse.json(course);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.studyCourse.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
