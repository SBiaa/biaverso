import { prisma } from "@/lib/prisma";
import { donePostStatuses, doneTaskStatuses } from "@/lib/ace-shared";
import { addUtcDays, todayUtc } from "@/lib/utils";
import { getWeekStart } from "@/lib/cardapio";

// Server-only: importa "@/lib/prisma", então nunca pode ser importado de um
// componente "use client" — veja "@/lib/projects-shared" para a parte client-safe.
export * from "@/lib/projects-shared";

import type { ProjectCard, ProjectsOverview } from "@/lib/projects-shared";

/**
 * Alimenta a página /projetos e a aba Projetos do negócio.
 *
 * Uma consulta só, com os itens de cada projeto embutidos: contar tarefas
 * projeto a projeto seria um N+1 que cresce junto com a lista.
 */
export async function getProjectsOverview(
  businessId?: string,
): Promise<ProjectsOverview> {
  const today = todayUtc();
  const weekStart = getWeekStart(today);
  const weekEnd = addUtcDays(weekStart, 7);

  const projects = await prisma.project.findMany({
    where: businessId ? { businessId } : undefined,
    select: {
      id: true,
      name: true,
      status: true,
      isInternal: true,
      startDate: true,
      endDate: true,
      businessId: true,
      business: { select: { name: true, color: true } },
      client: { select: { id: true, name: true } },
      productionTasks: { select: { status: true, dueDate: true } },
      contentPosts: { select: { status: true, publishDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let pendingTasks = 0;
  let dueThisWeek = 0;

  const cards: ProjectCard[] = projects.map((project) => {
    // Posts e tarefas de produção contam junto: é o que a tela do projeto lista.
    const items = [
      ...project.productionTasks.map((t) => ({
        date: t.dueDate,
        done: doneTaskStatuses.includes(t.status),
      })),
      ...project.contentPosts.map((p) => ({
        date: p.publishDate,
        done: donePostStatuses.includes(p.status),
      })),
    ];

    const total = items.length;
    const doneCount = items.filter((i) => i.done).length;
    const open = items.filter((i) => !i.done);

    const openDates = open
      .map((i) => i.date)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const nextDeadline = openDates[0] ?? null;
    const overdue = openDates.some((d) => d.getTime() < today.getTime());

    pendingTasks += open.length;
    dueThisWeek += openDates.filter(
      (d) => d.getTime() >= weekStart.getTime() && d.getTime() < weekEnd.getTime(),
    ).length;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      isInternal: project.isInternal,
      businessId: project.businessId,
      businessName: project.business.name,
      businessColor: project.business.color,
      clientName: project.client?.name ?? null,
      totalItems: total,
      doneItems: doneCount,
      // Projeto sem nenhum item fica em 0% em vez de dividir por zero.
      progress: total === 0 ? 0 : Math.round((doneCount / total) * 100),
      nextDeadline: nextDeadline ? nextDeadline.toISOString() : null,
      overdue,
    };
  });

  return {
    projects: cards,
    summary: {
      activeProjects: cards.filter((p) => p.status === "EM_ANDAMENTO").length,
      pendingTasks,
      dueThisWeek,
      overdueProjects: cards.filter((p) => p.overdue).length,
    },
  };
}
