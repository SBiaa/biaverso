import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { productionTaskPatchSchema } from "@/lib/schemas";
import { linkClientToBusiness, resolveTaskCompletedAt } from "@/lib/ace";
import { getCoverVersions } from "@/lib/business-cover";
import { projectHref } from "@/lib/projects-shared";
import { productionTypeLabels } from "@/lib/labels";
import { todayUtc } from "@/lib/utils";
import type { ProductionPeekData } from "@/lib/production-peek";

type Params = { params: Promise<{ id: string }> };

/**
 * Tudo o que o painel lateral da tarefa precisa, de uma vez: a tarefa no mesmo
 * formato do Dia e as opções de tipo, cliente e projeto. É o que deixa o
 * painel abrir igual no Kanban, no calendário, nos projetos e no Dia.
 */
export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const t = await prisma.productionTask.findUniqueOrThrow({
    where: { id },
    include: {
      business: { select: { id: true, name: true, color: true } },
      client: { select: { name: true } },
      project: { select: { id: true, name: true } },
      subtasks: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, done: true, stage: true },
      },
    },
  });

  const [clients, projects, covers] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        businessLinks: { where: { businessId: t.businessId }, select: { id: true } },
      },
    }),
    prisma.project.findMany({
      where: {
        businessId: t.businessId,
        // O projeto atual vem mesmo concluído: continua sendo o da tarefa.
        // (Sem projeto, nada de `id: undefined`: o Prisma ignora o filtro e
        // traria todos os projetos do negócio.)
        OR: t.projectId
          ? [{ status: "EM_ANDAMENTO" }, { id: t.projectId }]
          : [{ status: "EM_ANDAMENTO" }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, businessId: true },
    }),
    getCoverVersions([t.businessId]),
  ]);

  const today = todayUtc().getTime();
  const done = t.status === "CONCLUIDO";
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  const late = [t.scheduledDate, t.dueDate].some((d) => d !== null && d.getTime() < today);

  const data: ProductionPeekData = {
    task: {
      kind: "production",
      id: t.id,
      title: t.title,
      done,
      progress: t.progress,
      doneOnLoad: done,
      originLabel: t.business.name,
      originColor: t.business.color,
      originHref: `/negocios/${t.businessId}`,
      detail: [productionTypeLabels[t.type], t.client?.name ?? "Interno"].join(" · "),
      urgent: !done && t.priority === "URGENTE",
      priorityLevelId: t.priorityLevelId,
      estimateMinutes: t.estimateMinutes,
      position: null,
      dueDate: iso(t.dueDate),
      scheduledDate: iso(t.scheduledDate),
      completedAt: iso(t.completedAt),
      overdue: !done && t.status !== "PRAZO_PERDIDO" && late,
      missed: t.status === "PRAZO_PERDIDO",
      collectionId: null,
      subtasks: t.subtasks,
      project: t.project
        ? { id: t.project.id, name: t.project.name, href: projectHref(t.businessId, t.project.id) }
        : null,
      businessId: t.businessId,
      description: t.description,
      notes: t.notes,
    },
    production: {
      type: t.type,
      status: t.status,
      clientId: t.clientId,
      priority: t.priority,
      clients: clients.map((c) => ({ id: c.id, name: c.name, linked: c.businessLinks.length > 0 })),
    },
    projects,
    coverVersion: covers[t.businessId] ?? null,
  };

  return NextResponse.json(data);
});

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { completedAt, status, ...patch } = await parseBody(request, productionTaskPatchSchema);

  const existing = await prisma.productionTask.findUniqueOrThrow({ where: { id } });

  const task = await prisma.productionTask.update({
    where: { id },
    data: {
      ...patch,
      status,
      completedAt:
        status !== undefined
          ? resolveTaskCompletedAt(status, completedAt, existing.completedAt)
          : completedAt,
    },
  });

  // Trocar para um cliente de outro negócio também cria o vínculo aqui.
  if (task.clientId && task.clientId !== existing.clientId) {
    await linkClientToBusiness(task.clientId, task.businessId);
  }

  return NextResponse.json(task);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await prisma.productionTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
