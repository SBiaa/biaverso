import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { status } = await request.json();

  const link = await prisma.clientBusiness.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(link);
}
