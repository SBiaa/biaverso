import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { knowledgeSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, knowledgeSchema);
  return NextResponse.json(await prisma.knowledge.create({ data }));
});
