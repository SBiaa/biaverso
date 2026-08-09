import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pillarId = searchParams.get("pillarId");

  const desires = await prisma.desire.findMany({
    where: pillarId ? { pillarId } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(desires);
}

export async function POST(request: Request) {
  const { title, description, pillarId } = await request.json();

  const desire = await prisma.desire.create({
    data: {
      title,
      description: description || null,
      pillarId: pillarId || null,
    },
  });

  return NextResponse.json(desire);
}
