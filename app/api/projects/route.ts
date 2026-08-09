import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, description, status, startDate, endDate, businessId, clientId } =
    await request.json();

  const project = await prisma.project.create({
    data: {
      name,
      description: description || null,
      status: status || "EM_ANDAMENTO",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      businessId,
      clientId: clientId || null,
    },
  });

  return NextResponse.json(project);
}
