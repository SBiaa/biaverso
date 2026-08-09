import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, description, color, icon } = await request.json();

  const business = await prisma.business.create({
    data: {
      name,
      description: description || null,
      color: color || undefined,
      icon: icon || null,
    },
  });

  return NextResponse.json(business);
}
