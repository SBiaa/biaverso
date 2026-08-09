import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const pillars = await prisma.pillar.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(pillars);
}

export async function POST(request: Request) {
  const { name, description, color, icon, order } = await request.json();

  const pillar = await prisma.pillar.create({
    data: {
      name,
      description: description || null,
      color: color || undefined,
      icon: icon || null,
      order: order ?? 0,
    },
  });

  return NextResponse.json(pillar);
}
