import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery, route } from "@/lib/api";
import { aceListQuerySchema, productionTaskCreateSchema } from "@/lib/schemas";
import { resolveTaskCompletedAt, scopeClientFilter } from "@/lib/ace";
import type { Prisma } from "@/app/generated/prisma/client";

export const GET = route(async (request: Request) => {
  const q = parseQuery(request, aceListQuerySchema);

  const tasks = await prisma.productionTask.findMany({
    where: {
      businessId: q.businessId,
      // Um cliente específico já é mais restrito que qualquer escopo.
      clientId: q.clientId ?? scopeClientFilter(q.scope),
      projectId: q.projectId,
      status: q.status as Prisma.ProductionTaskWhereInput["status"],
      type: q.type as Prisma.ProductionTaskWhereInput["type"],
      priority: q.priority,
      dueDate: q.from || q.to ? { gte: q.from, lte: q.to } : undefined,
    },
    include: { client: true, project: true },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(tasks);
});

export const POST = route(async (request: Request) => {
  const { completedAt, ...data } = await parseBody(request, productionTaskCreateSchema);

  const task = await prisma.productionTask.create({
    data: {
      ...data,
      dueDate: data.dueDate ?? null,
      projectId: data.projectId ?? null,
      completedAt: resolveTaskCompletedAt(data.status, completedAt, null),
    },
  });

  return NextResponse.json(task);
});
