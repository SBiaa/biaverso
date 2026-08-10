// Pure helpers/constants shared between server code and client components —
// this file must never import "@/lib/prisma" (ver "@/lib/settings").

export const DEFAULT_SETTINGS = { waterGoal: 8, waterUnitMl: 300 };

export type UserSettingsValues = typeof DEFAULT_SETTINGS;

/** "3 de 8 (900ml de 2400ml)" — o resumo que aparece junto dos gotinhos. */
export function formatWaterProgress(
  count: number,
  { waterGoal, waterUnitMl }: UserSettingsValues,
) {
  return `${count} de ${waterGoal} (${count * waterUnitMl}ml de ${waterGoal * waterUnitMl}ml)`;
}
