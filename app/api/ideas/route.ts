import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { title, description, businessId } = await request.json();

  const idea = await prisma.idea.create({
    data: {
      title,
      description: description || null,
      businessId: businessId || null,
    },
  });

  return NextResponse.json(idea);
}
