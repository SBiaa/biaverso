import {
  Briefcase,
  Compass,
  Globe,
  Heart,
  Moon,
  Palette,
  Rocket,
  Sparkles,
  Star,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const PILLAR_COLORS = [
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#3B82F6",
  "#DC2626",
  "#0891B2",
  "#65A30D",
];

export const PILLAR_ICONS: Record<string, LucideIcon> = {
  heart: Heart,
  moon: Moon,
  briefcase: Briefcase,
  palette: Palette,
  users: Users,
  star: Star,
  zap: Zap,
  globe: Globe,
  sparkles: Sparkles,
  rocket: Rocket,
};

export function getPillarIcon(icon?: string | null): LucideIcon {
  return (icon && PILLAR_ICONS[icon]) || Compass;
}

/**
 * Cor de cada valor de status/tipo/termo, para as etiquetas das tabelas. Os
 * valores de prioridade não entram aqui: a cor deles é da usuária (Configurações).
 */
export const VISION_TONES: Record<string, string> = {
  // Status de objetivo.
  NAO_INICIADO: "#64748B",
  EM_ANDAMENTO: "#16A34A",
  PAUSADO: "#DC2626",
  CONCLUIDO: "#2563EB",
  CANCELADO: "#78716C",
  // Status do pilar.
  ATIVO: "#16A34A",
  // Tipo do pilar.
  PESSOAL: "#2563EB",
  NEGOCIO: "#D97706",
  // Termo do objetivo.
  JA: "#DC2626",
  CURTO_PRAZO: "#D97706",
  MEDIO_PRAZO: "#0891B2",
  LONGO_PRAZO: "#7C3AED",
};
