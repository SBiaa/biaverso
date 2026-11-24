import { hashString } from "@/lib/utils";

// Helpers puros, seguros pra importar de componente "use client".

/** Paleta oferecida no seletor de cor da clienta. */
export const CLIENT_COLORS = [
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#65A30D",
  "#059669",
  "#0891B2",
  "#2563EB",
  "#9333EA",
];

/**
 * Cor automática de uma clienta sem cor escolhida: sai do nome, então é
 * estável entre telas e diferente entre clientas (até onde a paleta permite).
 */
export function autoClientColor(name: string) {
  return CLIENT_COLORS[hashString(name) % CLIENT_COLORS.length];
}

/** Cor efetiva da clienta: a escolhida, ou a automática quando não há. */
export function getClientColor(client: { name: string; color: string | null }) {
  return client.color ?? autoClientColor(client.name);
}
