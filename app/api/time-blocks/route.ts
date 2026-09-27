import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/api";
import { timeBlockCreateSchema } from "@/lib/schemas";

export const POST = route(async (request: Request) => {
  const { dayId, categoryId, title, startTime, endTime } = await parseBody(
    request,
    timeBlockCreateSchema,
  );

  if (endTime <= startTime) {
    throw new ApiError(400, "O fim do bloco precisa ser depois do início.");
  }

  const block = await prisma.timeBlock.create({
    data: { dayId, categoryId, title, startTime, endTime },
  });

  return NextResponse.json(block);
});
