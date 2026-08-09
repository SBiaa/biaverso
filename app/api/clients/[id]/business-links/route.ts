import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { businessId } = await request.json();

  try {
    const link = await prisma.clientBusiness.create({
      data: { clientId: id, businessId },
    });
    return NextResponse.json(link);
  } catch {
    return NextResponse.json(
      { error: "Cliente já vinculado a este negócio." },
      { status: 409 },
    );
  }
}
