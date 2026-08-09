import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTaskCompletedAt } from "@/lib/ace";
import type { Prisma } from "@/app/generated/prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const clientId = searchParams.get("clientId");
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const priority = searchParams.get("priority");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const tasks = await prisma.productionTask.findMany({
    where: {
      businessId: businessId || undefined,
      clientId: clientId || undefined,
      projectId: projectId || undefined,
      status: status ? (status as Prisma.ProductionTaskWhereInput["status"]) : undefined,
      type: type ? (type as Prisma.ProductionTaskWhereInput["type"]) : undefined,
      priority: priority ? (priority as Prisma.ProductionTaskWhereInput["priority"]) : undefined,
      dueDate:
        from || to
          ? {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            }
          : undefined,
    },
    include: { client: true, project: true },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const {
    title,
    type,
    description,
    priority,
    status,
    dueDate,
    completedAt,
    businessId,
    clientId,
    projectId,
    notes,
  } = await request.json();

  const resolvedStatus = status || "A_FAZER";

  const task = await prisma.productionTask.create({
    data: {
      title,
      type,
      description: description || null,
      priority: priority || "NORMAL",
      status: resolvedStatus,
      dueDate: dueDate ? new Date(dueDate) : null,
      completedAt: resolveTaskCompletedAt(resolvedStatus, completedAt, null),
      notes: notes || null,
      businessId,
      clientId,
      projectId: projectId || null,
    },
  });

  return NextResponse.json(task);
}
