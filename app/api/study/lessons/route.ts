import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { studyLessonCreateSchema } from "@/lib/schemas";
import { syncCourseProgress } from "@/lib/study";

export const POST = route(async (request: Request) => {
  const { courseId, titles } = await parseBody(request, studyLessonCreateSchema);
  const last = await prisma.studyLesson.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const start = (last?.order ?? -1) + 1;

  await prisma.studyLesson.createMany({
    data: titles.map((title, i) => ({ courseId, title, order: start + i })),
  });
  // Aula nova num curso concluído reabre o curso.
  await syncCourseProgress(courseId);
  return NextResponse.json({ ok: true });
});
