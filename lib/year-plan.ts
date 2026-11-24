import { todayUtc } from "@/lib/utils";

/**
 * O ano que está sendo planejado: de outubro em diante o que interessa já é o
 * ano que vem. Usa o dia no fuso do app, não o do servidor.
 */
export function planningYear(today: Date = todayUtc()) {
  return today.getUTCMonth() >= 9 ? today.getUTCFullYear() + 1 : today.getUTCFullYear();
}
