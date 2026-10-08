import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { AreaHeader } from "@/components/modules/conhecimento/AreaHeader";
import { AddSubjectForm } from "@/components/modules/conhecimento/AddSubjectForm";
import { SubjectList } from "@/components/modules/conhecimento/SubjectList";

export const dynamic = "force-dynamic";

export default async function AreaPage({
  params,
}: {
  params: Promise<{ areaId: string }>;
}) {
  const { areaId } = await params;

  const area = await prisma.studyArea.findUnique({
    where: { id: areaId },
    select: {
      id: true,
      name: true,
      emoji: true,
      subjects: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          materials: {
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, type: true, status: true, link: true },
          },
          courses: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              title: true,
              instructor: true,
              platform: true,
              status: true,
              lessons: { select: { done: true } },
            },
          },
        },
      },
    },
  });
  if (!area) notFound();

  return (
    <>
      <Topbar title={area.name} trail={[{ label: "Conhecimento", href: "/conhecimento" }]} />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-5 px-4 py-5 md:px-8 md:py-8">
        <AreaHeader area={{ id: area.id, name: area.name, emoji: area.emoji }} />

        <AddSubjectForm areaId={area.id} />

        {area.subjects.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nenhum assunto ainda. Crie um (ex.: Tráfego pago) e depois adicione os cursos dele.
          </p>
        ) : (
          <SubjectList
            areaId={area.id}
            subjects={area.subjects.map((subject) => ({
              id: subject.id,
              name: subject.name,
              description: subject.description,
              status: subject.status,
              materials: subject.materials,
              courses: subject.courses.map((c) => ({
                id: c.id,
                title: c.title,
                instructor: c.instructor,
                platform: c.platform,
                status: c.status,
                lessonsTotal: c.lessons.length,
                lessonsDone: c.lessons.filter((l) => l.done).length,
              })),
            }))}
          />
        )}
      </main>
    </>
  );
}
