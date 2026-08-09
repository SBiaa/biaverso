import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, email, phone, instagram, notes, businessId } =
    await request.json();

  const client = await prisma.client.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      instagram: instagram || null,
      notes: notes || null,
      businessLinks: {
        create: { businessId },
      },
    },
    include: { businessLinks: true },
  });

  return NextResponse.json(client);
}
