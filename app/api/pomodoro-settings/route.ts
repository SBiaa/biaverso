import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { pomodoroSettingsSchema } from "@/lib/schemas";
import { getPomodoroSettings } from "@/lib/time-tracking";

export const dynamic = "force-dynamic";

export const GET = route(async () => NextResponse.json(await getPomodoroSettings()));

export const PUT = route(async (request: Request) => {
  const data = await parseBody(request, pomodoroSettingsSchema);
  await prisma.pomodoroSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
  return NextResponse.json(await getPomodoroSettings());
});
