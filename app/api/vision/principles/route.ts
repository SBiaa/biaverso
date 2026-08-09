import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pillarId = searchParams.get("pillarId");

  const principles = await prisma.principle.findMany({
    where: pillarId ? { pillarId } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(principles);
}

export async function POST(request: Request) {
  const { title, body, pillarId } = await request.json();

  const principle = await prisma.principle.create({
    data: {
      title,
      body: body || null,
      pillarId: pillarId || null,
    },
  });

  return NextResponse.json(principle);
}
