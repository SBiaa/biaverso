// Pure helpers/constants shared between server code and client components —
// this file must never import "@/lib/prisma" (ver "@/lib/settings").

export type UserSettingsValues = {
  waterGoal: number;
  waterUnitMl: number;
  /** Null = ainda não definido; a central de produtos avisa em vez de contar zero. */
  hourlyRate: number | null;
  /** Margem de lucro desejada, em %. */
  targetMargin: number;
};

export const DEFAULT_SETTINGS: UserSettingsValues = {
  waterGoal: 8,
  waterUnitMl: 300,
  hourlyRate: null,
  targetMargin: 60,
};

/** "3 de 8 (900ml de 2400ml)" — o resumo que aparece junto dos gotinhos. */
export function formatWaterProgress(
  count: number,
  { waterGoal, waterUnitMl }: UserSettingsValues,
) {
  return `${count} de ${waterGoal} (${count * waterUnitMl}ml de ${waterGoal * waterUnitMl}ml)`;
}
