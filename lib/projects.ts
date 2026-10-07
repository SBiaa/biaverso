import { prisma } from "@/lib/prisma";
import { donePostStatuses, doneTaskStatuses } from "@/lib/ace-shared";
import { addUtcDays, toDateInputValue, todayUtc } from "@/lib/utils";
import {
  contentStatusLabels,
  postTypeLabels,
  productionStatusLabels,
  productionTypeLabels,
  projectStatusLabels,
} from "@/lib/labels";
import { contentStatusColors, productionStatusColors } from "@/lib/ace-shared";
import type { ProjectItem } from "@/components/modules/projetos/ProjectCalendar";
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
      description: true,
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
      description: project.description,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      endDate: project.endDate ? project.endDate.toISOString() : null,
      clientId: project.client?.id ?? null,
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

/**
 * Itens do calendário geral: tarefas e posts dos projetos informados, mais o
 * fim de cada projeto. Já vêm no formato do calendário, com o projeto de origem.
 */
export async function getProjectsCalendarItems(
  projects: ProjectCard[],
): Promise<ProjectItem[]> {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const ids = [...byId.keys()];
  if (ids.length === 0) return [];

  const [tasks, posts] = await Promise.all([
    prisma.productionTask.findMany({
      where: { projectId: { in: ids } },
      select: {
        id: true, title: true, type: true, status: true,
        dueDate: true, completedAt: true, projectId: true,
      },
    }),
    prisma.contentPost.findMany({
      where: { projectId: { in: ids } },
      select: {
        id: true, title: true, type: true, status: true,
        publishDate: true, completedAt: true, projectId: true,
      },
    }),
  ]);

  const contextOf = (projectId: string | null) => {
    const p = projectId ? byId.get(projectId) : undefined;
    if (!p) return undefined;
    return {
      projectName: p.name,
      businessName: p.businessName,
      color: p.businessColor,
      href: `/negocios/${p.businessId}/projetos/${p.id}`,
    };
  };
  const day = (d: Date | null) => (d ? toDateInputValue(d) : null);

  const items: ProjectItem[] = [
    ...tasks.map<ProjectItem>((t) => ({
      key: `task-${t.id}`,
      kind: "task",
      id: t.id,
      title: t.title,
      typeLabel: productionTypeLabels[t.type] ?? t.type,
      statusLabel: productionStatusLabels[t.status] ?? t.status,
      statusColor: productionStatusColors[t.status] ?? "",
      date: day(t.dueDate),
      finishedOn: day(t.completedAt),
      done: doneTaskStatuses.includes(t.status),
      context: contextOf(t.projectId),
    })),
    ...posts.map<ProjectItem>((p) => ({
      key: `post-${p.id}`,
      kind: "post",
      id: p.id,
      title: p.title,
      typeLabel: postTypeLabels[p.type] ?? p.type,
      statusLabel: contentStatusLabels[p.status] ?? p.status,
      statusColor: contentStatusColors[p.status] ?? "",
      date: day(p.publishDate),
      finishedOn: day(p.completedAt),
      done: donePostStatuses.includes(p.status),
      context: contextOf(p.projectId),
    })),
    // Fim do projeto, só dos que ainda estão rolando.
    ...projects
      .filter((p) => p.endDate && p.status !== "CONCLUIDO" && p.status !== "CANCELADO")
      .map<ProjectItem>((p) => ({
        key: `project-${p.id}`,
        kind: "project",
        id: p.id,
        title: p.name,
        typeLabel: "Projeto",
        statusLabel: projectStatusLabels[p.status] ?? p.status,
        statusColor: "bg-surface border border-border text-text-primary",
        date: toDateInputValue(p.endDate!),
        finishedOn: null,
        done: false,
        context: contextOf(p.id),
      })),
  ];

  return items.filter((i) => i.date);
}
