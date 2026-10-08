import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { KnowledgeFilters } from "@/components/modules/conhecimento/KnowledgeFilters";
import { AddKnowledgeForm } from "@/components/modules/conhecimento/AddKnowledgeForm";
import { KnowledgeCard } from "@/components/modules/conhecimento/KnowledgeCard";
import { AddAreaForm } from "@/components/modules/conhecimento/AddAreaForm";
import { AreaGrid } from "@/components/modules/conhecimento/AreaGrid";
import { StudyOverview } from "@/components/modules/conhecimento/StudyOverview";
import { getStudyStats } from "@/lib/study-stats";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ type?: string; area?: string; status?: string; subject?: string }>;

export default async function ConhecimentoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const where: Prisma.KnowledgeWhereInput = {};
  if (params.type) where.type = params.type as Prisma.KnowledgeWhereInput["type"];
  if (params.area) where.area = params.area as Prisma.KnowledgeWhereInput["area"];
  if (params.status) where.status = params.status as Prisma.KnowledgeWhereInput["status"];
  // "none" = só os que ainda não estão em nenhum assunto.
  if (params.subject) where.subjectId = params.subject === "none" ? null : params.subject;

  const [stats, areas, items, subjectRows] = await Promise.all([
    getStudyStats(),
    prisma.studyArea.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        emoji: true,
        subjects: {
          select: {
            courses: {
              select: { status: true, lessons: { select: { done: true } } },
            },
          },
        },
      },
    }),
    prisma.knowledge.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.studySubject.findMany({
      orderBy: [{ area: { order: "asc" } }, { order: "asc" }],
      select: { id: true, name: true, area: { select: { name: true } } },
    }),
  ]);

  // "Área › Assunto": o select de material precisa dizer de qual área é o assunto.
  const subjects = subjectRows.map((s) => ({ id: s.id, label: `${s.area.name} › ${s.name}` }));

  return (
    <>
      <Topbar title="Conhecimento" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-6 px-4 py-5 md:px-8 md:py-8 md:space-y-8">
        {stats.coursesTotal > 0 && <StudyOverview stats={stats} />}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text-primary">Cadernos por área</h2>
            <AddAreaForm />
          </div>

          {areas.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Crie a primeira área (ex.: Marketing, Programação) e dentro dela os assuntos, cursos
              e aulas.
            </p>
          ) : (
            <AreaGrid
              areas={areas.map((area) => {
                const courses = area.subjects.flatMap((s) => s.courses);
                const lessons = courses.flatMap((c) => c.lessons);
                return {
                  id: area.id,
                  name: area.name,
                  emoji: area.emoji,
                  subjects: area.subjects.length,
                  courses: courses.length,
                  studying: courses.filter((c) => c.status === "ESTUDANDO").length,
                  lessonsDone: lessons.filter((l) => l.done).length,
                  lessonsTotal: lessons.length,
                };
              })}
            />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Materiais soltos</h2>
          <p className="text-xs text-text-secondary">
            Vídeos, artigos, podcasts e posts que não são um curso com aulas.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <KnowledgeFilters subjects={subjects} />
          </div>

          <AddKnowledgeForm subjects={subjects} />

          {items.length === 0 ? (
            <p className="text-sm text-text-secondary">Nenhum conteúdo cadastrado ainda.</p>
          ) : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
              {items.map((item) => (
                <KnowledgeCard
                  key={item.id}
                  subjects={subjects}
                  item={{
                    ...item,
                    startedAt: item.startedAt ? item.startedAt.toISOString() : null,
                    finishedAt: item.finishedAt ? item.finishedAt.toISOString() : null,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
