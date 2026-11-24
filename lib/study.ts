import { prisma } from "@/lib/prisma";

/**
 * O curso acompanha as aulas: marcar a primeira põe "Estudando", marcar a
 * última põe "Estudado" (com a data), e desmarcar uma aula de um curso
 * concluído o reabre. Pausado/Abandonado são decisão dela e só mudam quando
 * o curso termina de fato.
 */
export async function syncCourseProgress(courseId: string) {
  const [course, total, done] = await Promise.all([
    prisma.studyCourse.findUnique({ where: { id: courseId } }),
    prisma.studyLesson.count({ where: { courseId } }),
    prisma.studyLesson.count({ where: { courseId, done: true } }),
  ]);
  if (!course || total === 0) return;

  const allDone = done === total;

  if (allDone && course.status !== "ESTUDADO") {
    await prisma.studyCourse.update({
      where: { id: courseId },
      data: {
        status: "ESTUDADO",
        finishedAt: new Date(),
        startedAt: course.startedAt ?? new Date(),
      },
    });
  } else if (!allDone && course.status === "ESTUDADO") {
    await prisma.studyCourse.update({
      where: { id: courseId },
      data: { status: "ESTUDANDO", finishedAt: null },
    });
  } else if (done > 0 && course.status === "QUERO_ESTUDAR") {
    await prisma.studyCourse.update({
      where: { id: courseId },
      data: { status: "ESTUDANDO", startedAt: course.startedAt ?? new Date() },
    });
  }
}
