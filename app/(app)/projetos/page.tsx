import { AlertTriangle, CalendarClock, FolderKanban, ListTodo } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui";
import { ProjectGrid } from "@/components/modules/projetos/ProjectGrid";
import { ProjectFilterBar } from "@/components/modules/projetos/ProjectFilterBar";
import { getProjectsOverview } from "@/lib/projects";
import { projectSortOptions, type ProjectSort } from "@/lib/projects-shared";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  businessId?: string;
  status?: string;
  scope?: string;
  sort?: string;
}>;

export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const [{ projects, summary }, businesses] = await Promise.all([
    getProjectsOverview(sp.businessId || undefined),
    prisma.business.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Os cards de resumo acompanham o filtro de negócio (que já entrou na
  // consulta), mas não os de status/escopo — senão "projetos atrasados" sempre
  // bateria com o total da lista e não diria mais nada.
  const filtered = projects.filter((p) => {
    if (sp.status && p.status !== sp.status) return false;
    if (sp.scope === "interno" && !p.isInternal) return false;
    if (sp.scope === "cliente" && p.isInternal) return false;
    return true;
  });

  const sort: ProjectSort = projectSortOptions.includes(sp.sort as ProjectSort)
    ? (sp.sort as ProjectSort)
    : "prazo";

  return (
    <>
      <Topbar title="Projetos" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Projetos ativos"
            value={summary.activeProjects}
            icon={<FolderKanban size={16} className="text-text-secondary" />}
          />
          <StatCard
            label="Tarefas pendentes"
            value={summary.pendingTasks}
            icon={<ListTodo size={16} className="text-text-secondary" />}
          />
          <StatCard
            label="Prazos esta semana"
            value={summary.dueThisWeek}
            icon={<CalendarClock size={16} className="text-text-secondary" />}
          />
          <StatCard
            label="Projetos atrasados"
            value={summary.overdueProjects}
            icon={<AlertTriangle size={16} className="text-text-secondary" />}
            valueClassName={summary.overdueProjects > 0 ? "text-red-600" : undefined}
          />
        </div>

        <ProjectFilterBar businesses={businesses} />

        <ProjectGrid
          projects={filtered}
          sort={sort}
          showBusinessGroups={!sp.businessId}
        />
      </main>
    </>
  );
}
