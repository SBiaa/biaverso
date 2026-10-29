import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import type { TaskOptionDTO } from "@/lib/time-tracking-shared";

export const dynamic = "force-dynamic";

// As tarefas em aberto de um projeto, para o seletor do cronômetro.
export const GET = route(async (request: Request) => {
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json([] satisfies TaskOptionDTO[]);

  const tasks = await prisma.task.findMany({
    where: { projectId, done: false },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true },
    take: 100,
  });
  return NextResponse.json(tasks satisfies TaskOptionDTO[]);
});
