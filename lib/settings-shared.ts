// Pure helpers/constants shared between server code and client components —
// this file must never import "@/lib/prisma" (ver "@/lib/settings").

import { DEFAULT_ACCENT } from "@/lib/accent";

export type UserSettingsValues = {
  waterGoal: number;
  waterUnitMl: number;
  /** Null = ainda não definido; a central de produtos avisa em vez de contar zero. */
  hourlyRate: number | null;
  /** Margem de lucro desejada, em %. */
  targetMargin: number;
  /** Cor de destaque, em hexadecimal. As variacoes saem dela (ver lib/accent). */
  accentColor: string;
};

export const DEFAULT_SETTINGS: UserSettingsValues = {
  waterGoal: 8,
  waterUnitMl: 300,
  hourlyRate: null,
  targetMargin: 60,
  accentColor: DEFAULT_ACCENT,
};

/** "3 de 8 (900ml de 2400ml)" — o resumo que aparece junto dos gotinhos. */
export function formatWaterProgress(
  count: number,
  { waterGoal, waterUnitMl }: UserSettingsValues,
) {
  return `${count} de ${waterGoal} (${count * waterUnitMl}ml de ${waterGoal * waterUnitMl}ml)`;
}
