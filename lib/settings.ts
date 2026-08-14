import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS, type UserSettingsValues } from "@/lib/settings-shared";

// Server-only: este arquivo importa "@/lib/prisma", então nunca pode ser
// importado de um componente "use client" — use "@/lib/settings-shared".
export * from "@/lib/settings-shared";

// Só existe uma pessoa usando o app — as preferências ficam sempre nesta linha.
export const USER_SETTINGS_ID = "single";

/**
 * Preferências salvas, ou os valores padrão enquanto ninguém abriu a tela de
 * configurações. Ler nunca cria a linha: quem grava é o PATCH de /api/settings.
 */
export async function getUserSettings(): Promise<UserSettingsValues> {
  const settings = await prisma.userSettings.findUnique({
    where: { id: USER_SETTINGS_ID },
    select: {
      waterGoal: true,
      waterUnitMl: true,
      hourlyRate: true,
      targetMargin: true,
    },
  });

  return settings ?? DEFAULT_SETTINGS;
}
