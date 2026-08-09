import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name, description, color, icon, active } = await request.json();

  const business = await prisma.business.update({
    where: { id },
    data: { name, description, color, icon, active },
  });

  return NextResponse.json(business);
}
