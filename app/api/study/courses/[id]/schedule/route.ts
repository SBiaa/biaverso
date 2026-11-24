import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { studyCourseScheduleSchema } from "@/lib/schemas";
import { addUtcDays } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

/**
 * Distribui as aulas que ainda faltam, na ordem do curso, uma por dia a partir
 * de `startDate`. As já feitas não mudam. É o "quero ler uma carta por dia":
 * cada aula ganha o dia dela e aparece no Dia a dia na data certa.
 */
export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { startDate } = await parseBody(request, studyCourseScheduleSchema);

  const pending = await prisma.studyLesson.findMany({
    where: { courseId: id, done: false },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  await prisma.$transaction(
    pending.map((lesson, i) =>
      prisma.studyLesson.update({
        where: { id: lesson.id },
        data: { scheduledDate: addUtcDays(startDate, i) },
      }),
    ),
  );
  return NextResponse.json({ scheduled: pending.length });
});
