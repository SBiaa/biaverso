import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { studyLessonPatchSchema } from "@/lib/schemas";
import { syncCourseProgress } from "@/lib/study";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { done, ...patch } = await parseBody(request, studyLessonPatchSchema);

  const lesson = await prisma.studyLesson.update({
    where: { id },
    data: {
      ...patch,
      ...(done === undefined ? {} : { done, completedAt: done ? new Date() : null }),
    },
  });
  if (done !== undefined) await syncCourseProgress(lesson.courseId);
  return NextResponse.json(lesson);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const lesson = await prisma.studyLesson.delete({ where: { id } });
  await syncCourseProgress(lesson.courseId);
  return NextResponse.json({ ok: true });
});
