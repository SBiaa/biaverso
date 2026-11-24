import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { studyCourseCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const data = await parseBody(request, studyCourseCreateSchema);
  return NextResponse.json(await prisma.studyCourse.create({ data }));
});
