import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { CourseView } from "@/components/modules/conhecimento/CourseView";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const course = await prisma.studyCourse.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      subject: { select: { name: true, area: { select: { id: true, name: true } } } },
    },
  });
  if (!course) notFound();

  const areaHref = `/conhecimento/${course.subject.area.id}`;

  return (
    <>
      <Topbar
        title={course.title}
        trail={[
          { label: "Conhecimento", href: "/conhecimento" },
          { label: course.subject.area.name, href: areaHref },
          { label: course.subject.name },
        ]}
      />
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-5 md:px-8 md:py-8">
        <CourseView
          backHref={areaHref}
          course={{
            id: course.id,
            title: course.title,
            instructor: course.instructor,
            platform: course.platform,
            link: course.link,
            notes: course.notes,
            status: course.status,
            startedAt: course.startedAt ? course.startedAt.toISOString() : null,
            finishedAt: course.finishedAt ? course.finishedAt.toISOString() : null,
          }}
          lessons={course.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            link: l.link,
            notes: l.notes,
            done: l.done,
            scheduledDate: l.scheduledDate ? l.scheduledDate.toISOString() : null,
            dueDate: l.dueDate ? l.dueDate.toISOString() : null,
          }))}
        />
      </main>
    </>
  );
}
