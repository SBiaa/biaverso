import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import type { TaskOptionDTO } from "@/lib/time-tracking-shared";

export const dynamic = "force-dynamic";

// As tarefas em aberto de um projeto, para o seletor do cronômetro. Vêm de duas
// tabelas: as da página do projeto ("Tarefas e posts", ProductionTask) e as do
// Dia a dia ligadas ao projeto (Task).
export const GET = route(async (request: Request) => {
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json([] satisfies TaskOptionDTO[]);

  const [productionTasks, tasks] = await Promise.all([
    prisma.productionTask.findMany({
      where: { projectId, status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      select: { id: true, title: true },
      take: 100,
    }),
    prisma.task.findMany({
      where: { projectId, done: false },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true },
      take: 100,
    }),
  ]);

  const options: TaskOptionDTO[] = [
    ...productionTasks.map((t) => ({ ...t, kind: "production" as const })),
    ...tasks.map((t) => ({ ...t, kind: "task" as const })),
  ];
  return NextResponse.json(options);
});
