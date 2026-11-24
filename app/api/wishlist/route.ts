import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { wishlistItemCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, wishlistItemCreateSchema);

  const item = await prisma.wishlistItem.create({
    data: { ...data, businessId: data.businessId ?? null },
  });

  return NextResponse.json(item);
});
