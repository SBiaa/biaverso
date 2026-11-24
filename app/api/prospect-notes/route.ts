import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { prospectNoteCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, prospectNoteCreateSchema);
  return NextResponse.json(await prisma.prospectNote.create({ data }));
});
