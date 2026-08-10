import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { settingsPatchSchema } from "@/lib/schemas";
import { DEFAULT_SETTINGS, USER_SETTINGS_ID, getUserSettings } from "@/lib/settings";

export const GET = route(async () => {
  return NextResponse.json(await getUserSettings());
});

export const PATCH = route(async (request: Request) => {
  const fields = await parseBody(request, settingsPatchSchema);

  const settings = await prisma.userSettings.upsert({
    where: { id: USER_SETTINGS_ID },
    create: { id: USER_SETTINGS_ID, ...DEFAULT_SETTINGS, ...fields },
    update: fields,
    select: { waterGoal: true, waterUnitMl: true },
  });

  return NextResponse.json(settings);
});
