import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";

type Params = { params: Promise<{ groupId: string }> };

/** Desfaz o conjunto; os posts continuam onde estão. */
export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { groupId } = await params;
  await prisma.contentPost.updateMany({
    where: { gridGroupId: groupId },
    data: { gridGroupId: null },
  });
  return NextResponse.json({ ok: true });
});
